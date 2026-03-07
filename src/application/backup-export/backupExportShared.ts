import type { BackupType } from '@/hooks/backupFileBrowserContracts';
import type { StorageListReport } from '@/services/backup/baseStorageService';
import { MONTH_NAMES } from '@/services/backup/baseStorageService';
import {
  listYears as listHandoffYears,
  listMonths as listHandoffMonths,
  listFilesInMonthWithReport as listHandoffFilesInMonthWithReport,
} from '@/services/backup/pdfStorageService';
import {
  listCensusYears,
  listCensusMonths,
  listCensusFilesInMonthWithReport,
} from '@/services/backup/censusStorageService';
import {
  listCudyrYears,
  listCudyrMonths,
  listCudyrFilesInMonthWithReport,
} from '@/services/backup/cudyrStorageService';

export const EMPTY_STORAGE_LIST_REPORT: StorageListReport = {
  skippedNotFound: 0,
  skippedRestricted: 0,
  skippedUnknown: 0,
  skippedUnparsed: 0,
  timedOut: false,
};

export const monthNameToNumber = (name: string): string => {
  const index = MONTH_NAMES.indexOf(name);
  return String(index + 1).padStart(2, '0');
};

export const hasDegradedStorageListReport = (report: StorageListReport): boolean =>
  report.timedOut ||
  report.skippedRestricted > 0 ||
  report.skippedUnknown > 0 ||
  report.skippedUnparsed > 0;

export const resolveBackupStorageServices = (backupType: BackupType) => ({
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
