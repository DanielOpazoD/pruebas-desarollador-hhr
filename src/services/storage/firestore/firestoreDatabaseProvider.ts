import { FirestoreProvider } from '@/services/infrastructure/db/FirestoreProvider';
import type { IDatabaseProvider } from '@/services/infrastructure/db/types';
import { defaultFirestoreServiceRuntime } from '@/services/storage/firestore/firestoreServiceRuntime';
import type { FirestoreServiceRuntimePort } from '@/services/storage/firestore/ports/firestoreServiceRuntimePort';

/**
 * Canonical Firestore-backed database provider for repository-style services.
 *
 * The provider implementation remains in `services/infrastructure/db`, but
 * concrete runtime access now enters through the Firestore storage boundary.
 */
export const createFirestoreDatabaseProvider = (
  runtime: FirestoreServiceRuntimePort = defaultFirestoreServiceRuntime
): IDatabaseProvider =>
  new FirestoreProvider({
    getFirestore: () => runtime.getDb(),
  });

export const firestoreDb: IDatabaseProvider = createFirestoreDatabaseProvider();

export type {
  IDatabaseBatch,
  IDatabaseProvider,
  OrderByConstraint,
  QueryConstraint,
  QueryOptions,
} from '@/services/infrastructure/db/types';
