import {
  createApplicationDegraded,
  createApplicationFailed,
  createApplicationSuccess,
  type ApplicationOutcome,
} from '@/application/shared/applicationOutcome';
import { defaultBackupFilesPort, type BackupFilesPort } from '@/application/ports/backupFilesPort';
import type { BackupFile, BackupFilePreview, BackupFilters, BackupShiftType } from '@/types/backup';

interface BackupFilesUseCaseDependencies {
  backupFilesPort?: BackupFilesPort;
}

const resolveBackupFilesPort = (dependencies: BackupFilesUseCaseDependencies) =>
  dependencies.backupFilesPort || defaultBackupFilesPort;

export const executeListBackupCrudFiles = async (
  filters?: BackupFilters,
  dependencies: BackupFilesUseCaseDependencies = {}
): Promise<ApplicationOutcome<BackupFilePreview[]>> => {
  try {
    const files = await resolveBackupFilesPort(dependencies).listFiles(filters);
    return createApplicationSuccess(files);
  } catch (error) {
    return createApplicationDegraded(
      [],
      [
        {
          kind: 'unknown',
          message:
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los archivos de respaldo.',
        },
      ]
    );
  }
};

export const executeGetBackupCrudFile = async (
  id: string,
  dependencies: BackupFilesUseCaseDependencies = {}
): Promise<ApplicationOutcome<BackupFile | null>> => {
  try {
    const file = await resolveBackupFilesPort(dependencies).getFile(id);
    if (!file) {
      return createApplicationFailed(null, [
        { kind: 'not_found', message: 'Archivo no encontrado.' },
      ]);
    }
    return createApplicationSuccess(file);
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'No se pudo cargar el archivo.',
      },
    ]);
  }
};

export const executeDeleteBackupCrudFile = async (
  id: string,
  dependencies: BackupFilesUseCaseDependencies = {}
): Promise<ApplicationOutcome<{ deleted: true } | null>> => {
  try {
    await resolveBackupFilesPort(dependencies).deleteFile(id);
    return createApplicationSuccess({ deleted: true });
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'No se pudo eliminar el archivo.',
      },
    ]);
  }
};

interface SaveNursingHandoffBackupInput {
  date: string;
  shiftType: BackupShiftType;
  deliveryStaff: string;
  receivingStaff: string;
  content: Record<string, unknown>;
}

export const executeSaveNursingHandoffCrudBackup = async (
  input: SaveNursingHandoffBackupInput,
  dependencies: BackupFilesUseCaseDependencies = {}
): Promise<ApplicationOutcome<string | null>> => {
  try {
    const id = await resolveBackupFilesPort(dependencies).saveNursingHandoff(
      input.date,
      input.shiftType,
      input.deliveryStaff,
      input.receivingStaff,
      input.content
    );
    return createApplicationSuccess(id);
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'No se pudo crear el respaldo.',
      },
    ]);
  }
};

export const executeCheckBackupCrudExists = async (
  date: string,
  shiftType: BackupShiftType,
  dependencies: BackupFilesUseCaseDependencies = {}
): Promise<ApplicationOutcome<boolean>> => {
  try {
    const exists = await resolveBackupFilesPort(dependencies).checkExists(date, shiftType);
    return createApplicationSuccess(exists);
  } catch (error) {
    return createApplicationDegraded(false, [
      {
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'No se pudo verificar el respaldo.',
      },
    ]);
  }
};
