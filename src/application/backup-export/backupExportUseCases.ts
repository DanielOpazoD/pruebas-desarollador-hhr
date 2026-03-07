import type { DailyRecord } from '@/types';
import type { JsonImportResult } from '@/services/exporters/exportImportJson';
import type { BackupItem, BackupType } from '@/hooks/backupFileBrowserContracts';
import type { StoredPdfFile } from '@/services/backup/pdfStorageService';
import type { BaseStoredFile, StorageListReport } from '@/services/backup/baseStorageService';
import { importDataJSONDetailed } from '@/services/exporters/exportImportJson';
import {
  createApplicationFailed,
  createApplicationDegraded,
  createApplicationPartial,
  createApplicationSuccess,
  type ApplicationOutcome,
} from '@/application/shared/applicationOutcome';
import {
  mergeMonthlyRecordsForBackup,
  resolveHandoffBackupStaff,
} from '@/hooks/controllers/exportManagerController';
import { getShiftSchedule } from '@/utils/dateUtils';
import { deletePdf } from '@/services/backup/pdfStorageService';
import { deleteCensusFile } from '@/services/backup/censusStorageService';
import { deleteCudyrFile } from '@/services/backup/cudyrStorageService';
import { runMonthlyBackfill } from '@/services/backup/monthlyBackfillService';
import { validateCriticalFields } from '@/services/validation/criticalFieldsValidator';
import type { StorageLookupResult } from '@/services/backup/storageLookupContracts';
import { MONTH_NAMES } from '@/services/backup/baseStorageService';
import {
  listYears as listHandoffYears,
  listMonths as listHandoffMonths,
  listFilesInMonthWithReport as listHandoffFilesInMonthWithReport,
  pdfExistsDetailed,
} from '@/services/backup/pdfStorageService';
import {
  listCensusYears,
  listCensusMonths,
  listCensusFilesInMonthWithReport,
  checkCensusExistsDetailed,
} from '@/services/backup/censusStorageService';
import {
  listCudyrYears,
  listCudyrMonths,
  listCudyrFilesInMonthWithReport,
  cudyrExistsDetailed,
} from '@/services/backup/cudyrStorageService';
import { defaultDailyRecordReadPort } from '@/application/ports/dailyRecordPort';
import { defaultCensusEmailDeliveryPort } from '@/application/ports/censusEmailPort';

const EMPTY_STORAGE_LIST_REPORT: StorageListReport = {
  skippedNotFound: 0,
  skippedRestricted: 0,
  skippedUnknown: 0,
  skippedUnparsed: 0,
  timedOut: false,
};

const monthNameToNumber = (name: string): string => {
  const index = MONTH_NAMES.indexOf(name);
  return String(index + 1).padStart(2, '0');
};

const hasDegradedStorageListReport = (report: StorageListReport): boolean =>
  report.timedOut ||
  report.skippedRestricted > 0 ||
  report.skippedUnknown > 0 ||
  report.skippedUnparsed > 0;

const resolveBackupStorageServices = (backupType: BackupType) => ({
  listYears:
    backupType === 'handoff'
      ? listHandoffYears
      : backupType === 'census'
        ? listCensusYears
        : listCudyrYears,
  listMonths:
    backupType === 'handoff'
      ? listHandoffMonths
      : backupType === 'census'
        ? listCensusMonths
        : listCudyrMonths,
  listFilesInMonthWithReport:
    backupType === 'handoff'
      ? listHandoffFilesInMonthWithReport
      : backupType === 'census'
        ? listCensusFilesInMonthWithReport
        : listCudyrFilesInMonthWithReport,
});

export interface LookupBackupArchiveStatusInput {
  backupType: BackupType;
  date: string;
  shift?: 'day' | 'night';
}

export interface LookupBackupArchiveStatusOutput {
  exists: boolean;
  lookup: StorageLookupResult;
}

export const executeLookupBackupArchiveStatus = async ({
  backupType,
  date,
  shift = 'day',
}: LookupBackupArchiveStatusInput): Promise<
  ApplicationOutcome<LookupBackupArchiveStatusOutput>
> => {
  try {
    const lookup =
      backupType === 'handoff'
        ? await pdfExistsDetailed(date, shift)
        : backupType === 'census'
          ? await checkCensusExistsDetailed(date)
          : await cudyrExistsDetailed(date);

    const data = { exists: lookup.exists, lookup };
    if (lookup.status === 'restricted' || lookup.status === 'timeout') {
      return createApplicationDegraded(data, [
        {
          kind: 'unknown',
          message:
            lookup.status === 'restricted'
              ? 'No se pudo confirmar el respaldo por permisos de Storage.'
              : 'La verificación del respaldo excedió el tiempo esperado.',
        },
      ]);
    }

    return createApplicationSuccess(data);
  } catch (error) {
    return createApplicationFailed(
      {
        exists: false,
        lookup: { exists: false, status: 'error' },
      },
      [
        {
          kind: 'unknown',
          message:
            error instanceof Error ? error.message : 'Error al verificar el respaldo remoto.',
        },
      ]
    );
  }
};

export interface ListBackupFilesInput {
  backupType: BackupType;
  path: string[];
}

export interface ListBackupFilesOutput {
  items: BackupItem[];
  report: StorageListReport;
}

export const executeListBackupFiles = async ({
  backupType,
  path,
}: ListBackupFilesInput): Promise<ApplicationOutcome<ListBackupFilesOutput>> => {
  try {
    const service = resolveBackupStorageServices(backupType);

    if (path.length === 0) {
      const years = await service.listYears();
      return createApplicationSuccess({
        items: years.map(year => ({
          type: 'folder',
          data: { name: year, type: 'year' as const },
        })),
        report: EMPTY_STORAGE_LIST_REPORT,
      });
    }

    if (path.length === 1) {
      const months = await service.listMonths(path[0]);
      return createApplicationSuccess({
        items: months.map(month => ({
          type: 'folder',
          data: { name: month.name, number: month.number, type: 'month' as const },
        })),
        report: EMPTY_STORAGE_LIST_REPORT,
      });
    }

    if (path.length === 2) {
      const filesResult = await service.listFilesInMonthWithReport(
        path[0],
        monthNameToNumber(path[1])
      );
      const data = {
        items: filesResult.files.map(file => ({
          type: 'file' as const,
          data: file,
        })),
        report: filesResult.report,
      };

      if (hasDegradedStorageListReport(filesResult.report)) {
        return createApplicationDegraded(data, [
          {
            kind: 'unknown',
            message: 'La lista remota de respaldos quedó incompleta o degradada.',
          },
        ]);
      }

      return createApplicationSuccess(data);
    }

    return createApplicationSuccess({ items: [], report: EMPTY_STORAGE_LIST_REPORT });
  } catch (error) {
    return createApplicationFailed({ items: [], report: EMPTY_STORAGE_LIST_REPORT }, [
      {
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'Error al cargar respaldos remotos.',
      },
    ]);
  }
};

export interface BackupCensusExcelInput {
  selectedYear: number;
  selectedMonth: number;
  selectedDay: number;
  currentDateString: string;
  record: DailyRecord | null;
}

export interface BackupCensusExcelOutput {
  archivedDate: string;
  recordCount: number;
}

export const executeBackupCensusExcel = async (
  input: BackupCensusExcelInput
): Promise<ApplicationOutcome<BackupCensusExcelOutput | null>> => {
  try {
    const monthRecords = await defaultDailyRecordReadPort.getMonthRecords(
      input.selectedYear,
      input.selectedMonth
    );
    const limitDate = `${input.selectedYear}-${String(input.selectedMonth + 1).padStart(2, '0')}-${String(
      input.selectedDay
    ).padStart(2, '0')}`;

    const filteredRecords = mergeMonthlyRecordsForBackup(
      monthRecords,
      input.record,
      input.currentDateString,
      limitDate
    );

    if (filteredRecords.length === 0) {
      return createApplicationFailed(null, [
        { kind: 'validation', message: 'No hay registros para archivar.' },
      ]);
    }

    const { buildCensusMasterWorkbook } = await import('@/services/exporters/censusMasterWorkbook');
    const workbook = await buildCensusMasterWorkbook(filteredRecords);
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    await defaultCensusEmailDeliveryPort.uploadBackup(blob, input.currentDateString);

    return createApplicationSuccess({
      archivedDate: input.currentDateString,
      recordCount: filteredRecords.length,
    });
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message:
          error instanceof Error ? error.message : 'Error al realizar el respaldo en la nube',
      },
    ]);
  }
};

export interface ExportHandoffPdfInput {
  record: DailyRecord | null;
  selectedShift: 'day' | 'night';
}

export const executeExportHandoffPdf = async (
  input: ExportHandoffPdfInput
): Promise<ApplicationOutcome<null>> => {
  if (!input.record) {
    return createApplicationFailed(null, [
      { kind: 'validation', message: 'No hay registro para exportar.' },
    ]);
  }

  try {
    const { generateHandoffPdf } = await import('@/services/pdf/handoffPdfGenerator');
    await generateHandoffPdf(input.record, false, input.selectedShift, {
      dayStart: '08:00',
      dayEnd: '20:00',
      nightStart: '20:00',
      nightEnd: '08:00',
    });
    return createApplicationSuccess(null);
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'Error al generar el PDF.',
      },
    ]);
  }
};

export interface BackupHandoffPdfInput {
  record: DailyRecord | null;
  selectedShift: 'day' | 'night';
}

export interface BackupHandoffPdfOutput {
  shift: 'day' | 'night';
  createdCudyrBackup: boolean;
}

export const executeBackupHandoffPdf = async (
  input: BackupHandoffPdfInput
): Promise<ApplicationOutcome<BackupHandoffPdfOutput | null>> => {
  if (!input.record) {
    return createApplicationFailed(null, [
      { kind: 'validation', message: 'No hay registro para respaldar.' },
    ]);
  }

  const { delivers, receives } = resolveHandoffBackupStaff(input.record, input.selectedShift);
  if (delivers.length === 0 || receives.length === 0) {
    return createApplicationFailed(null, [
      {
        kind: 'validation',
        message: 'Selecciona enfermera que entrega y recibe antes de guardar',
      },
    ]);
  }

  const validation = validateCriticalFields(input.record);
  if (!validation.isValid) {
    return createApplicationFailed(null, [
      {
        kind: 'validation',
        message: 'Campos críticos incompletos. Complete los datos antes de guardar.',
      },
    ]);
  }

  try {
    const [{ default: jsPDF }, { default: autoTable }, { buildHandoffPdfContent }, { uploadPdf }] =
      await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
        import('@/services/backup/pdfContentBuilder'),
        import('@/services/backup/pdfStorageService'),
      ]);

    const schedule = getShiftSchedule(input.record.date);
    const doc = new jsPDF();
    await buildHandoffPdfContent(doc, input.record, input.selectedShift, schedule, autoTable);
    const pdfBlob = doc.output('blob');
    await uploadPdf(pdfBlob, input.record.date, input.selectedShift);

    if (input.selectedShift !== 'night') {
      return createApplicationSuccess({
        shift: input.selectedShift,
        createdCudyrBackup: false,
      });
    }

    try {
      const { generateCudyrMonthlyExcelBlob } = await import('@/services/cudyr/cudyrExportService');
      const { uploadCudyrExcel } = await import('@/services/backup/cudyrStorageService');
      const [year, month] = input.record.date.split('-').map(Number);
      const cudyrBlob = await generateCudyrMonthlyExcelBlob(
        year,
        month,
        input.record.date,
        input.record
      );
      await uploadCudyrExcel(cudyrBlob, input.record.date);
      return createApplicationSuccess({
        shift: input.selectedShift,
        createdCudyrBackup: true,
      });
    } catch (error) {
      return createApplicationPartial(
        {
          shift: input.selectedShift,
          createdCudyrBackup: false,
        },
        [
          {
            kind: 'unknown',
            message:
              error instanceof Error
                ? `PDF guardado, CUDYR falló: ${error.message}`
                : 'PDF guardado, CUDYR falló',
          },
        ]
      );
    }
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'Error al guardar el respaldo PDF',
      },
    ]);
  }
};

export const executeImportJsonBackup = async (
  file: File
): Promise<ApplicationOutcome<JsonImportResult>> => {
  try {
    const result = await importDataJSONDetailed(file);
    if (!result.success) {
      return createApplicationFailed(result, [
        { kind: 'validation', message: 'No se pudo importar el archivo JSON.' },
      ]);
    }
    if (result.outcome === 'partial' || result.outcome === 'repaired') {
      return createApplicationPartial(result, [
        {
          kind: 'unknown',
          message:
            result.outcome === 'partial'
              ? 'La importación se realizó parcialmente.'
              : 'La importación se realizó con reparaciones automáticas.',
        },
      ]);
    }
    return createApplicationSuccess(result);
  } catch (error) {
    return createApplicationFailed(
      {
        success: false,
        outcome: 'blocked',
        importedCount: 0,
        repairedCount: 0,
        skippedEntries: [],
      },
      [
        {
          kind: 'unknown',
          message: error instanceof Error ? error.message : 'Error al procesar el archivo JSON.',
        },
      ]
    );
  }
};

export interface DeleteBackupFileInput {
  backupType: BackupType;
  file: BaseStoredFile | StoredPdfFile;
}

export const executeDeleteBackupFile = async (
  input: DeleteBackupFileInput
): Promise<ApplicationOutcome<null>> => {
  try {
    if (input.backupType === 'handoff') {
      const pdfFile = input.file as StoredPdfFile;
      await deletePdf(pdfFile.date, pdfFile.shiftType);
    } else if (input.backupType === 'census') {
      await deleteCensusFile(input.file.date);
    } else {
      await deleteCudyrFile(input.file.date);
    }
    return createApplicationSuccess(null);
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'Error al eliminar archivo',
      },
    ]);
  }
};

export interface RunMonthlyBackfillInput {
  backupType: BackupType;
  year: number;
  monthNumber: number;
  existingFiles: Array<BaseStoredFile | StoredPdfFile>;
  onProgress?: (progress: { completed: number; total: number; currentLabel?: string }) => void;
}

export const executeRunMonthlyBackfill = async (input: RunMonthlyBackfillInput) => {
  try {
    const result = await runMonthlyBackfill(input);
    if (result.totalPlanned === 0) {
      return createApplicationSuccess(result);
    }
    if (result.failed > 0) {
      return createApplicationPartial(result, [
        {
          kind: 'unknown',
          message: `${result.failed} respaldo(s) fallaron durante la ejecución masiva.`,
        },
      ]);
    }
    return createApplicationSuccess(result);
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message:
          error instanceof Error ? error.message : 'Error al ejecutar respaldo masivo del mes',
      },
    ]);
  }
};
