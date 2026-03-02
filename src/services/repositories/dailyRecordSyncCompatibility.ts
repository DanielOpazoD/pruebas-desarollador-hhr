import { DailyRecord } from '@/types';

export const toRecordTimestamp = (value: string | undefined): number => {
  if (!value) return 0;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? millis : 0;
};

export const shouldKeepLocalRecordOverRemote = (
  localRecord: DailyRecord | null,
  remoteRecord: DailyRecord | null
): boolean => {
  if (!localRecord || !remoteRecord) return false;
  return toRecordTimestamp(localRecord.lastUpdated) > toRecordTimestamp(remoteRecord.lastUpdated);
};

export const resolvePreferredDailyRecord = (
  localRecord: DailyRecord | null,
  remoteRecord: DailyRecord | null
): DailyRecord | null => {
  if (!remoteRecord) {
    return localRecord;
  }

  return shouldKeepLocalRecordOverRemote(localRecord, remoteRecord) ? localRecord : remoteRecord;
};

export const mergeAvailableDates = (localDates: string[], remoteDates: string[]): string[] =>
  Array.from(new Set([...localDates, ...remoteDates]))
    .sort()
    .reverse();
