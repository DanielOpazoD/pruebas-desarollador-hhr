import { defaultFirestoreRuntime } from '@/services/firebase-runtime/firestoreRuntime';
import type { FirestoreServiceRuntimePort } from '@/services/storage/firestore/ports/firestoreServiceRuntimePort';

export const defaultFirestoreServiceRuntime: FirestoreServiceRuntimePort = {
  getDb: () => defaultFirestoreRuntime.db,
  ready: defaultFirestoreRuntime.ready as Promise<void>,
};
