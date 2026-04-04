import { collection, doc, type Firestore } from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
  type FirebaseStorage,
} from 'firebase/storage';
import {
  defaultFirebaseConfigRuntimeAdapter,
  type FirebaseConfigRuntimeAdapter,
} from '@/services/firebase-runtime/firebaseConfigRuntimeAdapter';

export interface ReminderFirestoreRuntime {
  firestore: Firestore;
  collection: typeof collection;
  doc: typeof doc;
}

export interface ReminderStorageRuntime {
  getStorage: () => Promise<FirebaseStorage>;
  ref: typeof ref;
  uploadBytes: typeof uploadBytes;
  getDownloadURL: typeof getDownloadURL;
  deleteObject: typeof deleteObject;
}

export const createReminderFirestoreRuntime = (
  adapter: FirebaseConfigRuntimeAdapter = defaultFirebaseConfigRuntimeAdapter
): ReminderFirestoreRuntime => ({
  get firestore() {
    return adapter.getDb();
  },
  collection,
  doc,
});

export const createReminderStorageRuntime = (
  adapter: FirebaseConfigRuntimeAdapter = defaultFirebaseConfigRuntimeAdapter
): ReminderStorageRuntime => ({
  getStorage: () => adapter.getStorage(),
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
});

export const defaultReminderFirestoreRuntime: ReminderFirestoreRuntime =
  createReminderFirestoreRuntime();
export const defaultReminderStorageRuntime: ReminderStorageRuntime = createReminderStorageRuntime();
