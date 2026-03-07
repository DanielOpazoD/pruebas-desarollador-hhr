/**
 * useBackupFilesQuery Hook
 * TanStack Query wrapper for backup file listing.
 * Natively resolves race conditions when navigating between folders.
 */

import { useQuery } from '@tanstack/react-query';
import { BaseStoredFile, type StorageListReport } from '@/services/backup/baseStorageService';
import { StoredPdfFile } from '@/services/backup/pdfStorageService';
import { executeListBackupFiles } from '@/application/backup-export/backupExportUseCases';
import type { BackupType } from '@/hooks/useBackupFileBrowser';

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

export const EMPTY_STORAGE_LIST_REPORT: StorageListReport = {
  skippedNotFound: 0,
  skippedRestricted: 0,
  skippedUnknown: 0,
  skippedUnparsed: 0,
  timedOut: false,
};

export const useBackupFilesQuery = (backupType: string, path: string[]) => {
  const query = useQuery({
    queryKey: ['backups', backupType, ...path],
    queryFn: async () => {
      return executeListBackupFiles({ backupType: backupType as BackupType, path });
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const listingOutcome = query.data;

  return {
    ...query,
    data: listingOutcome?.data.items ?? [],
    storageReport: listingOutcome?.data.report ?? EMPTY_STORAGE_LIST_REPORT,
    listingOutcome,
  };
};
