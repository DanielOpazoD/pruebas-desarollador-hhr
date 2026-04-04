import { initializeApp, type FirebaseApp, type FirebaseOptions } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
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
import { firebaseBootstrapLogger } from '@/services/firebase-runtime/firebaseRuntimeLoggers';

export interface FirebaseBootstrapResult {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

const AUTH_PERSISTENCE_TIMEOUTS_MS = {
  local: 2_500,
  session: 1_500,
  memory: 500,
} as const;

const getErrorMessage = (error: unknown): string =>
  error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error);

const startAuthPersistenceConfiguration = (auth: Auth): void => {
  const persistenceCandidates = [
    { mode: 'local' as const, persistence: browserLocalPersistence },
    { mode: 'session' as const, persistence: browserSessionPersistence },
    { mode: 'memory' as const, persistence: inMemoryPersistence },
  ];

  const attemptCandidate = (index: number): void => {
    const candidate = persistenceCandidates[index];
    if (!candidate) {
      firebaseBootstrapLogger.warn('[FirebaseConfig] Auth persistence could not be configured', {
        mode: 'unconfigured',
      });
      return;
    }

    const timeoutMs = AUTH_PERSISTENCE_TIMEOUTS_MS[candidate.mode];
    let didTimeout = false;
    const timeoutId = setTimeout(() => {
      didTimeout = true;
      firebaseBootstrapLogger.warn(
        `[FirebaseConfig] ⚠️ Auth persistence (${candidate.mode}) failed`,
        {
          message: `Auth persistence (${candidate.mode}) timed out after ${timeoutMs}ms`,
          mode: candidate.mode,
        }
      );
    }, timeoutMs);

    void setPersistence(auth, candidate.persistence)
      .then(() => {
        clearTimeout(timeoutId);
        firebaseBootstrapLogger.info('Auth persistence configured', {
          persistenceMode: candidate.mode,
          settledAfterTimeout: didTimeout,
        });
      })
      .catch(error => {
        clearTimeout(timeoutId);
        firebaseBootstrapLogger.warn(
          `[FirebaseConfig] ⚠️ Auth persistence (${candidate.mode}) failed`,
          {
            message: getErrorMessage(error),
            mode: candidate.mode,
            settledAfterTimeout: didTimeout,
          }
        );
        attemptCandidate(index + 1);
      });
  };

  attemptCandidate(0);
};

export const initializeFirebaseServices = async (
  config: FirebaseOptions
): Promise<FirebaseBootstrapResult> => {
  firebaseBootstrapLogger.info('Initializing services');
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
    firebaseBootstrapLogger.info('Firestore initialized', {
      cacheMode: useSingleTabCache ? 'single-tab' : 'multi-tab',
      persistenceRequested: true,
    });
  } catch (fsErr) {
    firebaseBootstrapLogger.warn(
      '[FirebaseConfig] ⚠️ Firestore persistence failed at init:',
      fsErr
    );
    db = initializeFirestore(app, {
      ignoreUndefinedProperties: true,
    });
  }

  startAuthPersistenceConfiguration(auth);

  firebaseBootstrapLogger.info('Firebase services ready');
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
      firebaseBootstrapLogger.warn(
        '[FirebaseConfig] Invalid Firestore emulator host:',
        firestoreEmulatorHost
      );
    }
  }
};
