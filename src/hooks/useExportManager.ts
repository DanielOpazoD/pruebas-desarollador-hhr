import { useState, useEffect, useCallback } from 'react';
import { DailyRecord } from '@/types';
import { checkCensusExistsDetailed, uploadCensus } from '@/services/backup/censusStorageService';
import { getMonthRecordsFromFirestore } from '@/services/storage/firestoreService';
import { useConfirmDialog, useNotification } from '@/context/UIContext';
import {
  buildArchiveStatusState,
  mergeMonthlyRecordsForBackup,
  resolveHandoffBackupStaff,
  shouldCheckArchiveStatus,
} from '@/hooks/controllers/exportManagerController';
import { getStorageLookupNotice } from '@/services/backup/storageUiPolicy';
import { getShiftSchedule } from '@/utils/dateUtils';

interface UseExportManagerProps {
  currentDateString: string;
  selectedYear: number;
  selectedMonth: number;
  selectedDay: number;
  record: DailyRecord | null;
  currentModule: string;
  selectedShift: 'day' | 'night';
}

export interface UseExportManagerReturn {
  isArchived: boolean;
  isBackingUp: boolean;
  handleExportPDF: () => Promise<void>;
  handleBackupExcel: () => Promise<void>;
  handleBackupHandoff: (skipConfirmation?: boolean) => Promise<void>;
}

export const useExportManager = ({
  currentDateString,
  selectedYear,
  selectedMonth,
  selectedDay,
  record,
  currentModule,
  selectedShift,
}: UseExportManagerProps): UseExportManagerReturn => {
  const { success, error: notifyError, warning } = useNotification();
  const { confirm } = useConfirmDialog();

  // Track if current date's census or handoff is already archived
  const [isArchived, setIsArchived] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);

  // Check archive status when date/module changes
  useEffect(() => {
    if (!shouldCheckArchiveStatus(currentDateString, currentModule)) {
      return;
    }

    if (currentModule === 'CENSUS') {
      checkCensusExistsDetailed(currentDateString)
        .then(result => {
          setIsArchived(buildArchiveStatusState(result));
          const notice = getStorageLookupNotice(result, 'censo');
          if (notice?.channel === 'warning') {
            warning(notice.title, notice.message);
          }
        })
        .catch(() => setIsArchived(false));
      return;
    }

    import('@/services/backup/pdfStorageService').then(({ pdfExistsDetailed }) => {
      pdfExistsDetailed(currentDateString, selectedShift)
        .then(result => {
          setIsArchived(buildArchiveStatusState(result));
          const notice = getStorageLookupNotice(result, 'PDF');
          if (notice?.channel === 'warning') {
            warning(notice.title, notice.message);
          }
        })
        .catch(() => setIsArchived(false));
    });
  }, [currentDateString, currentModule, selectedShift, warning]);

  const handleExportPDF = useCallback(async () => {
    try {
      // Import dynamically to avoid loading jsPDF on main bundle if possible
      const { generateHandoffPdf } = await import('@/services/pdf/handoffPdfGenerator');
      if (record) {
        await generateHandoffPdf(record, false, selectedShift, {
          dayStart: '08:00',
          dayEnd: '20:00',
          nightStart: '20:00',
          nightEnd: '08:00',
        });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      notifyError('Error al generar el PDF. Por favor intente nuevamente.');
    }
  }, [record, selectedShift, notifyError]);

  const handleBackupExcel = useCallback(async () => {
    setIsBackingUp(true);
    try {
      // Build Excel and upload to Firebase Storage
      const monthRecords = await getMonthRecordsFromFirestore(selectedYear, selectedMonth);
      const limitDate = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

      const filteredRecords = mergeMonthlyRecordsForBackup(
        monthRecords,
        record,
        currentDateString,
        limitDate
      );

      if (filteredRecords.length === 0) {
        warning('No hay registros para archivar.');
        return;
      }

      const { buildCensusMasterWorkbook } =
        await import('@/services/exporters/censusMasterWorkbook');
      const workbook = await buildCensusMasterWorkbook(filteredRecords);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      await uploadCensus(blob, currentDateString);
      setIsArchived(true);
      success('Excel archivado', `Guardado para ${currentDateString}`);
    } catch (err) {
      console.error('Error in backup:', err);
      notifyError('Error al realizar el respaldo en la nube');
    } finally {
      setIsBackingUp(false);
    }
  }, [
    selectedYear,
    selectedMonth,
    selectedDay,
    record,
    currentDateString,
    success,
    warning,
    notifyError,
  ]);

  const handleBackupHandoff = useCallback(
    async (skipConfirmation = false) => {
      if (!record) return;

      // Staff derive logic
      const { delivers, receives } = resolveHandoffBackupStaff(record, selectedShift);

      if (delivers.length === 0 || receives.length === 0) {
        warning('Selecciona enfermera que entrega y recibe antes de guardar');
        return;
      }

      // Validate critical fields
      const { validateCriticalFields, getMissingFieldsLabel } =
        await import('@/services/validation/criticalFieldsValidator');
      const validation = validateCriticalFields(record);
      if (!validation.isValid) {
        const firstIssue = validation.issues[0];
        const fieldsMessage = getMissingFieldsLabel(firstIssue.missingFields);
        warning(
          `Campos críticos incompletos`,
          `${validation.issueCount} paciente(s) sin ${fieldsMessage}. Complete los datos antes de guardar.`
        );
        return;
      }

      const [year, month, day] = record.date.split('-');
      const formattedDate = `${day}-${month}-${year}`;
      const shiftLabel = selectedShift === 'day' ? 'Turno Largo' : 'Turno Noche';
      const actionLabel = isArchived ? 'Actualizar' : 'Guardar';

      if (!skipConfirmation) {
        const confirmed = await confirm({
          title: `💾 ${actionLabel} Respaldo PDF`,
          message: isArchived
            ? `Ya existe un respaldo para ${shiftLabel} del ${formattedDate}.\n\n¿Desea sobrescribirlo con los datos actuales?`
            : `¿Desea guardar esta entrega de turno como archivo PDF?\n\nFecha: ${formattedDate}\nTurno: ${shiftLabel}`,
          confirmText: actionLabel,
          cancelText: 'Cancelar',
          variant: isArchived ? 'warning' : 'info',
        });

        if (!confirmed) return;
      }

      setIsBackingUp(true);
      try {
        const [
          { default: jsPDF },
          { default: autoTable },
          { buildHandoffPdfContent },
          { uploadPdf },
        ] = await Promise.all([
          import('jspdf'),
          import('jspdf-autotable'),
          import('@/services/backup/pdfContentBuilder'),
          import('@/services/backup/pdfStorageService'),
        ]);

        const schedule = getShiftSchedule(record.date);

        const doc = new jsPDF();
        await buildHandoffPdfContent(doc, record, selectedShift, schedule, autoTable);
        const pdfBlob = doc.output('blob');
        await uploadPdf(pdfBlob, record.date, selectedShift);

        if (selectedShift === 'night') {
          try {
            const { generateCudyrMonthlyExcelBlob } =
              await import('@/services/cudyr/cudyrExportService');
            const { uploadCudyrExcel } = await import('@/services/backup/cudyrStorageService');
            const [year, month] = record.date.split('-').map(Number);
            const cudyrBlob = await generateCudyrMonthlyExcelBlob(year, month, record.date, record);
            await uploadCudyrExcel(cudyrBlob, record.date);
            success('Respaldos guardados', 'PDF + CUDYR mensual');
          } catch (cudyrErr) {
            console.error('CUDYR backup failed:', cudyrErr);
            warning('PDF guardado, CUDYR falló');
          }
        } else {
          success('Respaldo PDF guardado');
        }
        setIsArchived(true);
      } catch (err) {
        console.error('Error saving handoff PDF:', err);
        notifyError('Error al guardar el respaldo PDF');
      } finally {
        setIsBackingUp(false);
      }
    },
    [record, selectedShift, success, warning, notifyError, confirm, isArchived]
  );

  return {
    isArchived,
    isBackingUp,
    handleExportPDF,
    handleBackupExcel,
    handleBackupHandoff,
  };
};
