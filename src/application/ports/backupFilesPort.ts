import {
  listBackupFiles,
  getBackupFile,
  deleteBackupFile,
  saveNursingHandoffBackup,
  checkBackupExists,
} from '@/services/backup/backupService';
import type { BackupFile, BackupFilePreview, BackupFilters, BackupShiftType } from '@/types/backup';

export interface BackupFilesPort {
  listFiles: (filters?: BackupFilters) => Promise<BackupFilePreview[]>;
  getFile: (id: string) => Promise<BackupFile | null>;
  deleteFile: (id: string) => Promise<void>;
  saveNursingHandoff: (
    date: string,
    shiftType: BackupShiftType,
    deliveryStaff: string,
    receivingStaff: string,
    content: Record<string, unknown>
  ) => Promise<string>;
  checkExists: (date: string, shiftType: BackupShiftType) => Promise<boolean>;
}

export const defaultBackupFilesPort: BackupFilesPort = {
  listFiles: async filters => listBackupFiles(filters),
  getFile: async id => getBackupFile(id),
  deleteFile: async id => deleteBackupFile(id),
  saveNursingHandoff: async (date, shiftType, deliveryStaff, receivingStaff, content) =>
    saveNursingHandoffBackup(date, shiftType, deliveryStaff, receivingStaff, content),
  checkExists: async (date, shiftType) => checkBackupExists(date, shiftType),
};
