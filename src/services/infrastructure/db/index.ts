import { FirestoreProvider } from './FirestoreProvider';
import { IDatabaseProvider } from './types';
import { db as firebaseDb } from '@/firebaseConfig';

/**
 * Singleton instance of the configured database provider.
 * This allows the entire application to use a generic DB interface
 * without knowing whether it's Firestore, MongoDB, or an in-memory DB for tests.
 */
export const createFirestoreDatabaseProvider = (): IDatabaseProvider =>
  new FirestoreProvider({ firestore: firebaseDb });

export const db: IDatabaseProvider = createFirestoreDatabaseProvider();

export * from './types';
