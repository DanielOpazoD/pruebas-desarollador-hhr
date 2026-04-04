import type { FirebaseStorage } from 'firebase/storage';
import {
  defaultFirebaseConfigRuntimeAdapter,
  type FirebaseConfigRuntimeAdapter,
} from '@/services/firebase-runtime/firebaseConfigRuntimeAdapter';

export interface StorageRuntime {
  ready: Promise<unknown>;
  getStorage: () => Promise<FirebaseStorage>;
}

export const createStorageRuntime = (
  adapter: FirebaseConfigRuntimeAdapter = defaultFirebaseConfigRuntimeAdapter
): StorageRuntime => ({
  ready: adapter.ready,
  getStorage: () => adapter.getStorage(),
});

export const defaultStorageRuntime: StorageRuntime = createStorageRuntime();
