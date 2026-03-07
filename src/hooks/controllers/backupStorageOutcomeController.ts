import type { ApplicationOutcome } from '@/application/shared/applicationOutcome';
import type {
  ListBackupFilesOutput,
  LookupBackupArchiveStatusOutput,
} from '@/application/backup-export/backupExportUseCases';
import { getStorageListNotice, getStorageLookupNotice } from '@/services/backup/storageUiPolicy';

interface OutcomePresentation {
  channel: 'warning' | 'info' | 'error' | null;
  title?: string;
  message?: string;
}

export const presentBackupLookupOutcome = (
  outcome: ApplicationOutcome<LookupBackupArchiveStatusOutput>
): OutcomePresentation => {
  if (outcome.status === 'failed') {
    return {
      channel: 'error',
      title: 'Verificación de respaldo fallida',
      message: outcome.issues[0]?.message || 'No se pudo consultar el respaldo remoto.',
    };
  }

  const notice = getStorageLookupNotice(outcome.data.lookup, 'respaldo');
  if (!notice) {
    return { channel: null };
  }

  return notice;
};

export const presentBackupListingOutcome = (
  outcome: ApplicationOutcome<ListBackupFilesOutput>
): OutcomePresentation => {
  if (outcome.status === 'failed') {
    return {
      channel: 'error',
      title: 'Carga de respaldos fallida',
      message: outcome.issues[0]?.message || 'No se pudo cargar la lista de respaldos.',
    };
  }

  const notice = getStorageListNotice(outcome.data.report);
  if (!notice) {
    return { channel: null };
  }

  return notice;
};
