import { useCallback, useState } from 'react';
import { deletePdf } from '@/services/backup/pdfStorageService';
import { deleteCensusFile } from '@/services/backup/censusStorageService';
import { deleteCudyrFile } from '@/services/backup/cudyrStorageService';
import { runMonthlyBackfill } from '@/services/backup/monthlyBackfillService';
import { MONTH_NAMES, type BaseStoredFile } from '@/services/backup/baseStorageService';
import type { StoredPdfFile } from '@/services/backup/pdfStorageService';
import { defaultBrowserWindowRuntime } from '@/shared/runtime/browserWindowRuntime';
import type { BackupType } from '@/hooks/useBackupFileBrowser';
import { resolveBackupModuleLabel } from '@/hooks/backupFileBrowserController';
import type { ConfirmOptions } from '@/context/uiContracts';

interface MagicBackfillProgressState {
  completed: number;
  total: number;
  currentLabel?: string;
}

interface NotificationApi {
  success: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
}

interface ConfirmApi {
  (options: ConfirmOptions): Promise<boolean>;
}

interface UseBackupFileBrowserActionsParams {
  selectedBackupType: BackupType;
  path: string[];
  role?: string;
  items: Array<{ type: 'folder' | 'file'; data: unknown }>;
  refetch: () => Promise<unknown> | unknown;
  notifications: NotificationApi;
  confirm: ConfirmApi;
}

export interface BackupFileBrowserActionHandlers {
  handleDelete: (file: BaseStoredFile | StoredPdfFile) => Promise<void>;
  handleDownload: (file: BaseStoredFile | StoredPdfFile) => void;
  handleMagicMonthBackfill: () => Promise<void>;
}

export const useBackupFileBrowserActions = ({
  selectedBackupType,
  path,
  role,
  items,
  refetch,
  notifications,
  confirm,
}: UseBackupFileBrowserActionsParams): BackupFileBrowserActionHandlers & {
  isMagicBackfilling: boolean;
  magicBackfillProgress: MagicBackfillProgressState | null;
} => {
  const [isMagicBackfilling, setIsMagicBackfilling] = useState(false);
  const [magicBackfillProgress, setMagicBackfillProgress] =
    useState<MagicBackfillProgressState | null>(null);

  const handleDelete = useCallback(
    async (file: BaseStoredFile | StoredPdfFile) => {
      const confirmed = await confirm({
        title: 'Eliminar Archivo',
        message: `¿Está seguro de eliminar "${file.name}"?\nEsta acción no se puede deshacer.`,
        confirmText: 'Eliminar',
        cancelText: 'Cancelar',
        variant: 'danger',
      });

      if (!confirmed) return;

      try {
        if (selectedBackupType === 'handoff') {
          const pdfFile = file as StoredPdfFile;
          await deletePdf(pdfFile.date, pdfFile.shiftType);
        } else if (selectedBackupType === 'census') {
          await deleteCensusFile(file.date);
        } else {
          await deleteCudyrFile(file.date);
        }
        notifications.success('Archivo eliminado');
        await refetch();
      } catch (error) {
        console.error('Delete error:', error);
        notifications.error('Error al eliminar archivo');
      }
    },
    [confirm, notifications, refetch, selectedBackupType]
  );

  const handleDownload = useCallback((file: BaseStoredFile | StoredPdfFile) => {
    if (file.downloadUrl) {
      defaultBrowserWindowRuntime.open(file.downloadUrl, '_blank');
    }
  }, []);

  const handleMagicMonthBackfill = useCallback(async () => {
    if (role === 'viewer') {
      notifications.warning('No tienes permisos para ejecutar respaldo masivo');
      return;
    }

    if (path.length !== 2) {
      notifications.warning('Selecciona un mes para ejecutar respaldo masivo');
      return;
    }

    const year = Number(path[0]);
    const monthName = path[1];
    const monthNumber = MONTH_NAMES.indexOf(monthName) + 1;

    if (!Number.isInteger(year) || monthNumber < 1) {
      notifications.error('No se pudo interpretar el mes seleccionado');
      return;
    }

    const confirmed = await confirm({
      title: `Respaldo masivo ${resolveBackupModuleLabel(selectedBackupType)}`,
      message: `Se respaldarán todas las fechas faltantes de ${monthName} ${year} para ${resolveBackupModuleLabel(selectedBackupType)}.\n\nEste proceso puede tardar algunos minutos.`,
      confirmText: 'Ejecutar',
      cancelText: 'Cancelar',
      variant: 'info',
    });

    if (!confirmed) return;

    setIsMagicBackfilling(true);
    setMagicBackfillProgress({ completed: 0, total: 0, currentLabel: undefined });

    try {
      const monthFiles = items
        .filter(item => item.type === 'file')
        .map(item => item.data as BaseStoredFile | StoredPdfFile);

      const result = await runMonthlyBackfill({
        backupType: selectedBackupType,
        year,
        monthNumber,
        existingFiles: monthFiles,
        onProgress: progress => setMagicBackfillProgress(progress),
      });

      await refetch();

      if (result.totalPlanned === 0) {
        const message =
          result.skippedNoRecord > 0
            ? `No hay registros clínicos para ${result.skippedNoRecord} fecha(s) del mes.`
            : 'No hay pendientes; todas las fechas con registros ya tienen respaldo.';
        notifications.info('Respaldo masivo sin pendientes', message);
        return;
      }

      const summary = [
        `Generados: ${result.created}`,
        `Fallidos: ${result.failed}`,
        `Sin registro diario: ${result.skippedNoRecord}`,
      ].join(' · ');

      if (result.failed > 0) {
        notifications.warning('Respaldo masivo completado con observaciones', summary);
      } else {
        notifications.success('Respaldo masivo completado', summary);
      }

      if (result.errors.length > 0) {
        notifications.error(
          'Errores detectados durante el respaldo masivo',
          result.errors.slice(0, 3).join('\n')
        );
      }
    } catch (error) {
      console.error('Magic backup error:', error);
      notifications.error('Error al ejecutar respaldo masivo del mes');
    } finally {
      setIsMagicBackfilling(false);
      setMagicBackfillProgress(null);
    }
  }, [confirm, items, notifications, path, refetch, role, selectedBackupType]);

  return {
    isMagicBackfilling,
    magicBackfillProgress,
    handleDelete,
    handleDownload,
    handleMagicMonthBackfill,
  };
};
