import { FirestoreProvider } from './FirestoreProvider';
import { IDatabaseProvider } from './types';
import { defaultFirestoreServiceRuntime } from '@/services/storage/firestore/firestoreServiceRuntime';
import type { FirestoreServiceRuntimePort } from '@/services/storage/firestore/ports/firestoreServiceRuntimePort';

/**
 * Singleton instance of the configured database provider.
 * This allows the entire application to use a generic DB interface
 * without knowing whether it's Firestore, MongoDB, or an in-memory DB for tests.
 */
export const createFirestoreDatabaseProvider = (
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): IDatabaseProvider =>
  new FirestoreProvider({
    getFirestore: () => runtime.getDb(),
  });

export const db: IDatabaseProvider = createFirestoreDatabaseProvider();

export * from './types';
