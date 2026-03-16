import type { BackupFileType, BackupShiftType } from '@/types/backup';
import { BACKUP_TYPE_CONFIG, SHIFT_TYPE_CONFIG } from '@/types/backup';

export const getBackupTypePresentation = (type: BackupFileType) => BACKUP_TYPE_CONFIG[type];

export const getBackupShiftPresentation = (shiftType: BackupShiftType) =>
  SHIFT_TYPE_CONFIG[shiftType];

export const formatBackupShiftLabel = (shiftType: BackupShiftType): string =>
  getBackupShiftPresentation(shiftType).label;

export const formatBackupTimestamp = (isoStr: string): string => {
  const date = new Date(isoStr);
  return date.toLocaleString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatBackupDisplayDate = (dateStr: string): string => {
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};
