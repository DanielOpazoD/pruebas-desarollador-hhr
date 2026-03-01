import { DailyRecord } from '@/types';

const toMillis = (value: string | undefined): number => {
  if (!value) return 0;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? millis : 0;
};

export const shouldKeepLocalRecordOverRemote = (
  localRecord: DailyRecord | null,
  remoteRecord: DailyRecord | null
): boolean => {
  if (!localRecord || !remoteRecord) return false;
  return toMillis(localRecord.lastUpdated) > toMillis(remoteRecord.lastUpdated);
};
