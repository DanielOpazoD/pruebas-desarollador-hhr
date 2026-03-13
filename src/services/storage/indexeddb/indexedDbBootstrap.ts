import { attachIndexedDbWarningBindings } from '@/services/storage/indexeddb/indexedDbWarningBindings';
import type { IndexedDbDatabaseLike } from '@/services/storage/indexeddb/indexedDbContracts';

export const attachIndexedDbEvents = (
  database: IndexedDbDatabaseLike,
  getRuntimeState: () => { isUsingMock: boolean; stickyFallbackMode: boolean },
  emittedIndexedDbWarnings: Set<string>
) => attachIndexedDbWarningBindings(database, getRuntimeState, emittedIndexedDbWarnings);

export const initializeIndexedDbDatabase = (
  createDatabase: () => IndexedDbDatabaseLike,
  attachEvents: (database: IndexedDbDatabaseLike) => void,
  onFallback: (error: unknown) => void
): IndexedDbDatabaseLike => {
  try {
    const database = createDatabase();
    attachEvents(database);
    return database;
  } catch (error) {
    onFallback(error);
    const database = createDatabase();
    attachEvents(database);
    return database;
  }
};
