import { DailyRecord } from '@/types';
import { saveRecord as saveToIndexedDB } from '@/services/storage/indexedDBService';
import { getRecordFromFirestore, subscribeToRecord } from '@/services/storage/firestoreService';
import { getLegacyRecord } from '@/services/storage/legacyFirebaseService';
import { isFirestoreEnabled } from '@/services/repositories/repositoryConfig';
import { migrateLegacyData } from '@/services/repositories/dataMigration';

export const subscribe = (
  date: string,
  callback: (r: DailyRecord | null, hasPendingWrites: boolean) => void
): (() => void) => {
  return subscribeToRecord(date, async (record, hasPendingWrites) => {
    const migrated = record ? migrateLegacyData(record, date) : null;
    if (migrated && !hasPendingWrites) {
      await saveToIndexedDB(migrated);
    }
    callback(migrated, hasPendingWrites);
  });
};

export const syncWithFirestore = async (date: string): Promise<DailyRecord | null> => {
  if (!isFirestoreEnabled()) return null;

  try {
    const record = await getRecordFromFirestore(date);
    if (record) {
      const migrated = migrateLegacyData(record, date);
      await saveToIndexedDB(migrated);
      return migrated;
    }

    const legacyRecord = await getLegacyRecord(date);
    if (legacyRecord) {
      const migrated = migrateLegacyData(legacyRecord, date);
      await saveToIndexedDB(migrated);
      return migrated;
    }
  } catch (err) {
    console.warn(`[Repository] Sync failed for ${date}:`, err);
  }
  return null;
};
