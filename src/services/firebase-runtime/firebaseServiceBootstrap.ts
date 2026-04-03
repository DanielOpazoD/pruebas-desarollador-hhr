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

const AUTH_PERSISTENCE_TIMEOUT_MS = 5_000;
const AUTH_PERSISTENCE_RETRY_DELAYS_MS = [250, 1_000] as const;

const getErrorMessage = (error: unknown): string =>
  error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error);

const withPersistenceTimeout = async <T>(operation: Promise<T>, mode: string): Promise<T> => {
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(
      () =>
        reject(
          new Error(`Auth persistence (${mode}) timed out after ${AUTH_PERSISTENCE_TIMEOUT_MS}ms`)
        ),
      AUTH_PERSISTENCE_TIMEOUT_MS
    )
  );

  return Promise.race([operation, timeoutPromise]);
};

const applyPersistenceWithRetry = async (
  auth: Auth,
  persistence: Parameters<typeof setPersistence>[1],
  mode: 'local' | 'session' | 'memory'
): Promise<void> => {
  const retryDelaysMs = mode === 'memory' ? [] : AUTH_PERSISTENCE_RETRY_DELAYS_MS;
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt++) {
    try {
      await withPersistenceTimeout(setPersistence(auth, persistence), mode);
      return;
    } catch (error) {
      lastError = error;
      if (attempt >= retryDelaysMs.length) {
        break;
      }

      const delayMs = retryDelaysMs[attempt];
      firebaseBootstrapLogger.warn('Retrying auth persistence configuration', {
        mode,
        attempt: attempt + 1,
        retryDelayMs: delayMs,
        message: getErrorMessage(error),
      });
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
};

const configureAuthPersistence = async (
  auth: Auth
): Promise<'local' | 'session' | 'memory' | 'unconfigured'> => {
  const persistenceCandidates = [
    { mode: 'local' as const, persistence: browserLocalPersistence },
    { mode: 'session' as const, persistence: browserSessionPersistence },
    { mode: 'memory' as const, persistence: inMemoryPersistence },
  ];

  for (const candidate of persistenceCandidates) {
    try {
      await applyPersistenceWithRetry(auth, candidate.persistence, candidate.mode);
      firebaseBootstrapLogger.info('Auth persistence configured', {
        persistenceMode: candidate.mode,
      });
      return candidate.mode;
    } catch (error) {
      firebaseBootstrapLogger.warn(
        `[FirebaseConfig] ⚠️ Auth persistence (${candidate.mode}) failed`,
        {
          message: getErrorMessage(error),
          mode: candidate.mode,
        }
      );
    }
  }

  return 'unconfigured';
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

  await configureAuthPersistence(auth);

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
