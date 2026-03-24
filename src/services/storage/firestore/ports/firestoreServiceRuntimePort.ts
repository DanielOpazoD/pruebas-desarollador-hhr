import type { Firestore } from 'firebase/firestore';

export interface FirestoreServiceRuntimePort {
  getDb: () => Firestore;
  ready: Promise<void>;
}
