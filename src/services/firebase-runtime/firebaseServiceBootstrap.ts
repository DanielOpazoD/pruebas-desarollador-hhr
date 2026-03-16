import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
  type Auth,
} from 'firebase/auth';
import {
  initializeFirestore,
  connectFirestoreEmulator,
  type Firestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
} from 'firebase/firestore';
import {
  parseEmulatorHost,
  shouldUseSingleTabFirestoreCache,
} from '@/services/firebase-runtime/firebaseEnvironmentPolicy';

export interface FirebaseBootstrapResult {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

export const initializeFirebaseServices = (config: FirebaseOptions): FirebaseBootstrapResult => {
  console.log('[FirebaseConfig] 🔌 Initializing services...');
  const app = initializeApp(config);
  const auth = getAuth(app);

  let db: Firestore;
  try {
    const useSingleTabCache = shouldUseSingleTabFirestoreCache();
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
      localCache: persistentLocalCache({
        tabManager: useSingleTabCache
          ? persistentSingleTabManager({})
          : persistentMultipleTabManager(),
      }),
    });
    console.log(
      `[FirebaseConfig] 💾 Firestore initialized (persistence requested, ${useSingleTabCache ? 'single-tab' : 'multi-tab'})`
    );
  } catch (fsErr) {
    console.warn('[FirebaseConfig] ⚠️ Firestore persistence failed at init:', fsErr);
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    });
  }

  setPersistence(auth, browserLocalPersistence).catch(err => {
    console.warn('[FirebaseConfig] ⚠️ Auth persistence failed:', err);
  });

  console.log('[FirebaseConfig] 🔥 Firebase services ready');
  return { app, auth, db };
};

export const connectFirebaseEmulators = ({
  auth,
  db,
}: Pick<FirebaseBootstrapResult, 'auth' | 'db'>) => {
  const authEmulatorHost = import.meta.env.VITE_AUTH_EMULATOR_HOST;
  const firestoreEmulatorHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST;

  if (import.meta.env.DEV && authEmulatorHost) {
    connectAuthEmulator(auth, authEmulatorHost);
  }

  if (import.meta.env.DEV && firestoreEmulatorHost) {
    const emulatorHost = parseEmulatorHost(firestoreEmulatorHost);
    if (emulatorHost) {
      connectFirestoreEmulator(db, emulatorHost.host, emulatorHost.port);
    } else {
      console.warn('[FirebaseConfig] Invalid Firestore emulator host:', firestoreEmulatorHost);
    }
  }
};
