import type { Firestore } from 'firebase/firestore';

export interface RepositoryFirestoreRuntimePort {
  getDb: () => Firestore;
}
