import type { BaseStoredFile, StoredPdfFile } from '@/types/backupArtifacts';

export type BackupType = 'handoff' | 'census' | 'cudyr';

export type BackupItemType = 'folder' | 'file';

export interface BackupFolder {
  name: string;
  type: 'year' | 'month';
  number?: string;
}

export interface BackupItem {
  type: BackupItemType;
  data: BackupFolder | StoredPdfFile | BaseStoredFile;
}
