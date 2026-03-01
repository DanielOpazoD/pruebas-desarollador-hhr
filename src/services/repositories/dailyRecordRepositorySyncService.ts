import { DailyRecord } from '@/types';
import {
  getRecordForDate as getRecordFromIndexedDB,
  saveRecord as saveToIndexedDB,
} from '@/services/storage/indexedDBService';
import { subscribeToRecord } from '@/services/storage/firestoreService';
import { isFirestoreEnabled } from '@/services/repositories/repositoryConfig';
import { migrateLegacyData } from '@/services/repositories/dataMigration';
import { loadRemoteRecordWithFallback } from '@/services/repositories/dailyRecordRemoteLoader';
import { shouldKeepLocalRecordOverRemote } from '@/services/repositories/dailyRecordSyncCompatibility';

const resolveIncomingRemoteRecord = async (
  date: string,
  remoteRecord: DailyRecord | null
): Promise<DailyRecord | null> => {
  if (!remoteRecord) return null;

  const localRecord = await getRecordFromIndexedDB(date);
  if (shouldKeepLocalRecordOverRemote(localRecord, remoteRecord)) {
    return localRecord;
  }

  await saveToIndexedDB(remoteRecord);
  return remoteRecord;
};

export const subscribe = (
  date: string,
  callback: (r: DailyRecord | null, hasPendingWrites: boolean) => void
): (() => void) => {
  return subscribeToRecord(date, async (record, hasPendingWrites) => {
    const migrated = record ? migrateLegacyData(record, date) : null;
    if (migrated && !hasPendingWrites) {
      const resolvedRecord = await resolveIncomingRemoteRecord(date, migrated);
      callback(resolvedRecord, hasPendingWrites);
      return;
    }
    callback(migrated, hasPendingWrites);
  });
};

export const syncWithFirestore = async (date: string): Promise<DailyRecord | null> => {
  if (!isFirestoreEnabled()) return null;

  try {
    const remoteResult = await loadRemoteRecordWithFallback(date);
    if (!remoteResult.record) return null;

    const localRecord = await getRecordFromIndexedDB(date);
    if (shouldKeepLocalRecordOverRemote(localRecord, remoteResult.record)) {
      return localRecord;
    }

    return remoteResult.record;
  } catch (err) {
    console.warn(`[Repository] Sync failed for ${date}:`, err);
  }
  return null;
};
