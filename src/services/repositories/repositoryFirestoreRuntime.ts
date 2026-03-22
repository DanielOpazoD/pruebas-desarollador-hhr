import { defaultFirestoreRuntime } from '@/services/firebase-runtime/firestoreRuntime';
import type { RepositoryFirestoreRuntimePort } from '@/services/repositories/ports/repositoryFirestoreRuntimePort';

export const defaultRepositoryFirestoreRuntime: RepositoryFirestoreRuntimePort = {
  getDb: () => defaultFirestoreRuntime.db,
};
