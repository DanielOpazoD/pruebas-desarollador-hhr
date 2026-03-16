import {
  listBackupFilesWithResult,
  getBackupFileWithResult,
  deleteBackupFileWithResult,
  saveNursingHandoffBackupWithResult,
  checkBackupExistsWithResult,
} from '@/services/backup/backupService';
import type { BackupFile, BackupFilePreview, BackupFilters, BackupShiftType } from '@/types/backup';
import type { BackupCrudResult } from '@/services/backup/backupCrudResults';

export interface BackupFilesPort {
  listFiles: (filters?: BackupFilters) => Promise<BackupCrudResult<BackupFilePreview[]>>;
  getFile: (id: string) => Promise<BackupCrudResult<BackupFile>>;
  deleteFile: (id: string) => Promise<BackupCrudResult<{ deleted: true }>>;
  saveNursingHandoff: (
    date: string,
    shiftType: BackupShiftType,
    deliveryStaff: string,
    receivingStaff: string,
    content: Record<string, unknown>
  ) => Promise<BackupCrudResult<string>>;
  checkExists: (date: string, shiftType: BackupShiftType) => Promise<BackupCrudResult<boolean>>;
}

export const defaultBackupFilesPort: BackupFilesPort = {
  listFiles: async filters => listBackupFilesWithResult(filters),
  getFile: async id => getBackupFileWithResult(id),
  deleteFile: async id => deleteBackupFileWithResult(id),
  saveNursingHandoff: async (date, shiftType, deliveryStaff, receivingStaff, content) =>
    saveNursingHandoffBackupWithResult(date, shiftType, deliveryStaff, receivingStaff, content),
  checkExists: async (date, shiftType) => checkBackupExistsWithResult(date, shiftType),
};
