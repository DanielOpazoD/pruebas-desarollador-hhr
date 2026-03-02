import { initializeApp, type FirebaseOptions, type FirebaseApp } from 'firebase/app';
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
} from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import type { Functions } from 'firebase/functions';
import { safeJsonParse } from '@/utils/jsonUtils';
import {
  getFirebaseAuthConfigStatus,
  getFirebaseRuntimeConfigDiagnostics,
  type FirebaseRuntimeConfigDiagnostics,
} from '@/services/auth/firebaseAuthConfigPolicy';
import {
  getFirebaseStartupFailureMessage,
  getFirebaseStartupWarningCopy,
} from '@/services/auth/firebaseStartupUiPolicy';
import { mountFirebaseConfigWarning } from '@/services/auth/firebaseStartupWarningRenderer';

const CACHED_CONFIG_KEY = 'hhr_firebase_config';
const FIREBASE_READY_TIMEOUT_MS = 10000;

const parseEmulatorHost = (rawHost: string): { host: string; port: number } | null => {
  const [host, portRaw] = rawHost.split(':');
  const port = Number(portRaw);
  if (!host || !Number.isFinite(port)) return null;
  return { host, port };
};

const readDevFirebaseApiKey = (): string => {
  const encodedKey = import.meta.env.VITE_FIREBASE_API_KEY_B64 || '';
  const plainKey = import.meta.env.VITE_FIREBASE_API_KEY || '';
  return encodedKey ? decodeBase64(encodedKey) : plainKey;
};

const decodeBase64 = (rawValue: string) => {
  const value = rawValue?.trim();
  if (!value) return '';

  const normalized = value
    .replace(/\s+/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(value.length / 4) * 4, '=');

  try {
    if (typeof atob === 'function') {
      return atob(normalized);
    }

    return Buffer.from(normalized, 'base64').toString('utf-8');
  } catch (error) {
    console.warn('Firebase API key could not be decoded from base64:', error);
    return '';
  }
};

const warnWithFirebaseDiagnostics = (
  diagnostics: FirebaseRuntimeConfigDiagnostics,
  fallbackMessage?: string
) => {
  mountFirebaseConfigWarning(
    fallbackMessage || getFirebaseStartupFailureMessage(diagnostics),
    getFirebaseStartupWarningCopy(diagnostics)
  );
};

const saveCachedConfig = (config: FirebaseOptions) => {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(CACHED_CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.warn('[FirebaseConfig] Failed to cache Firebase config:', error);
  }
};

const getCachedConfig = (): FirebaseOptions | null => {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(CACHED_CONFIG_KEY);
    if (!raw) return null;
    const parsed = safeJsonParse<FirebaseOptions | null>(raw, null);
    if (!parsed) return null;
    return parsed.apiKey ? parsed : null;
  } catch (error) {
    console.warn('[FirebaseConfig] Failed to read cached Firebase config:', error);
    return null;
  }
};

const fetchRuntimeConfig = async (): Promise<FirebaseOptions> => {
  const configUrl = `/.netlify/functions/firebase-config?t=${Date.now()}&mode=recovery`;
  const response = await fetch(configUrl, {
    headers: { 'Cache-Control': 'no-cache' },
  });

  if (!response.ok) {
    throw new Error(`Runtime config request failed (${response.status})`);
  }

  const config = await response.json();
  return config satisfies FirebaseOptions;
};

const buildDevConfig = (): FirebaseOptions => {
  const encodedKey = import.meta.env.VITE_FIREBASE_API_KEY_B64 || '';
  const plainKey = import.meta.env.VITE_FIREBASE_API_KEY || '';

  // eslint-disable-next-line no-console
  console.log('[FirebaseConfig] 🔍 Checking Environment Variables:', {
    hasApiKey: !!plainKey,
    hasB64Key: !!encodedKey,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    mode: import.meta.env.MODE,
  });

  return {
    apiKey: readDevFirebaseApiKey(),
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  } satisfies FirebaseOptions;
};

const loadFirebaseConfig = async () => {
  if (import.meta.env.DEV) {
    return buildDevConfig();
  }

  const cached = getCachedConfig();

  try {
    const config = await fetchRuntimeConfig();
    saveCachedConfig(config);
    return config;
  } catch (error) {
    if (cached?.apiKey) {
      console.warn('[FirebaseConfig] Using cached Firebase config due to network error');
      return cached;
    }

    console.error('Failed to load Firebase config from Netlify function', error);
    warnWithFirebaseDiagnostics(
      {
        issues: [
          {
            field: 'apiKey',
            severity: 'blocking',
            summary: 'No fue posible obtener la configuración principal de Firebase.',
            action:
              'Revisa la función de configuración del entorno y confirma que pueda devolver las variables de Firebase.',
          },
        ],
        hasBlockingIssue: true,
        summary:
          'No se pudo cargar la configuración principal del sistema. Revisa la función de configuración y las variables de Firebase del entorno.',
        nextStep: 'Corrige la configuración del entorno y vuelve a intentar.',
      },
      'No se pudo cargar la configuración principal del sistema. Revisa la función de configuración y las variables de Firebase del entorno.'
    );
    throw error;
  }
};

const warnOnFirebaseAuthConfig = (config: FirebaseOptions) => {
  const authConfigStatus = getFirebaseAuthConfigStatus(config.authDomain);

  if (!authConfigStatus.hasAuthDomain) {
    console.warn(
      `[FirebaseConfig] ⚠️ ${authConfigStatus.supportSummary} ${authConfigStatus.supportAction}`
    );
    return;
  }

  if (!authConfigStatus.usesFirebaseHostedAuthDomain) {
    console.warn(
      `[FirebaseConfig] ⚠️ ${authConfigStatus.supportSummary} ${authConfigStatus.supportAction}`
    );
  }
};

let app!: FirebaseApp;
let auth!: Auth;
let db!: Firestore;
let storage: FirebaseStorage | undefined;
let functions: Functions | undefined;
let functionsEmulatorConnected = false;

export const getStorageInstance = async (): Promise<FirebaseStorage> => {
  await firebaseReady;
  if (storage) return storage;

  const { getStorage } = await import('firebase/storage');
  storage = getStorage(app);
  return storage;
};

export const getFunctionsInstance = async (): Promise<Functions> => {
  await firebaseReady;
  if (!functions) {
    const { getFunctions } = await import('firebase/functions');
    functions = getFunctions(app);
  }

  if (import.meta.env.DEV && !functionsEmulatorConnected) {
    const functionsEmulatorHost = import.meta.env.VITE_FUNCTIONS_EMULATOR_HOST;
    if (functionsEmulatorHost) {
      const emulatorHost = parseEmulatorHost(functionsEmulatorHost);
      if (!emulatorHost) {
        console.warn('[FirebaseConfig] Invalid functions emulator host:', functionsEmulatorHost);
        return functions;
      }
      const { connectFunctionsEmulator } = await import('firebase/functions');
      connectFunctionsEmulator(functions, emulatorHost.host, emulatorHost.port);
      functionsEmulatorConnected = true;
    }
  }

  return functions;
};

export const firebaseReady = (async () => {
  // eslint-disable-next-line no-console
  console.log('[FirebaseConfig] 🚀 Starting Firebase Ready sequence...');

  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error('Firebase initialization timed out')),
      FIREBASE_READY_TIMEOUT_MS
    )
  );

  try {
    const configPromise = (async () => {
      const config = await loadFirebaseConfig();
      // eslint-disable-next-line no-console
      console.log('[FirebaseConfig] 📁 Config loaded:', config.projectId);
      // eslint-disable-next-line no-console
      console.log('[FirebaseConfig] 🪣 Storage Bucket:', config.storageBucket || 'not set');

      const diagnostics = getFirebaseRuntimeConfigDiagnostics(config);
      if (diagnostics.hasBlockingIssue) {
        warnWithFirebaseDiagnostics(diagnostics);
        throw new Error(getFirebaseStartupFailureMessage(diagnostics));
      }

      warnOnFirebaseAuthConfig(config);

      // eslint-disable-next-line no-console
      console.log('[FirebaseConfig] 🔌 Initializing services...');
      app = initializeApp(config);
      auth = getAuth(app);

      // Initialize Firestore. Note: persistentLocalCache can hang if IndexedDB is locked.
      try {
        db = initializeFirestore(app, {
          ignoreUndefinedProperties: true,
          localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager(),
          }),
        });
        // eslint-disable-next-line no-console
        console.log('[FirebaseConfig] 💾 Firestore initialized (persistence requested)');
      } catch (fsErr) {
        console.warn('[FirebaseConfig] ⚠️ Firestore persistence failed at init:', fsErr);
        db = initializeFirestore(app, {
          ignoreUndefinedProperties: true,
        });
      }

      // Set auth persistence in background to avoid blocking the whole app if it hangs
      setPersistence(auth, browserLocalPersistence).catch(err => {
        console.warn('[FirebaseConfig] ⚠️ Auth persistence failed:', err);
      });

      // eslint-disable-next-line no-console
      console.log('[FirebaseConfig] 🔥 Firebase services ready');

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

      return { app, auth, db };
    })();

    return await Promise.race([configPromise, timeout]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[FirebaseConfig] ❌ Critical initialization error:', message);
    throw err;
  }
})();

export { app, auth, db, storage, functions };
export { mountFirebaseConfigWarning as mountConfigWarning };
export default app;
