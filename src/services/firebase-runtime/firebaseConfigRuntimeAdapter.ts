import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { Functions } from 'firebase/functions';
import type { FirebaseStorage } from 'firebase/storage';

import * as firebaseConfig from '@/firebaseConfig';

export interface FirebaseConfigRuntimeAdapter {
  ready: Promise<unknown>;
  getAuth: () => Auth;
  getOptionalAuth: () => Auth | null;
  getDb: () => Firestore;
  getOptionalDb: () => Firestore | null;
  getFunctions: () => Promise<Functions>;
  getStorage: () => Promise<FirebaseStorage>;
}

const resolveReadyPromise = (): Promise<unknown> =>
  'firebaseReady' in firebaseConfig
    ? (firebaseConfig as { firebaseReady: Promise<unknown> }).firebaseReady
    : Promise.resolve();

export const createFirebaseConfigRuntimeAdapter = (
  overrides: Partial<FirebaseConfigRuntimeAdapter> = {}
): FirebaseConfigRuntimeAdapter => ({
  ready: resolveReadyPromise(),
  getAuth: () => {
    const auth = (firebaseConfig as { auth?: Auth }).auth;
    if (!auth) {
      throw new Error('Auth instance is not available yet.');
    }
    return auth;
  },
  getOptionalAuth: () => (firebaseConfig as { auth?: Auth }).auth ?? null,
  getDb: () => {
    const db = (firebaseConfig as { db?: Firestore }).db;
    if (!db) {
      throw new Error('Firestore instance is not available yet.');
    }
    return db;
  },
  getOptionalDb: () => (firebaseConfig as { db?: Firestore }).db ?? null,
  getFunctions: () => firebaseConfig.getFunctionsInstance(),
  getStorage: () => firebaseConfig.getStorageInstance(),
  ...overrides,
});

export const defaultFirebaseConfigRuntimeAdapter = createFirebaseConfigRuntimeAdapter();
