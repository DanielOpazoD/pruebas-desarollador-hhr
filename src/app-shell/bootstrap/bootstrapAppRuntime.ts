import { firebaseReady } from '@/firebaseConfig';
import { getFirebaseStartupFailureMessage } from '@/services/auth/firebaseStartupUiPolicy';
import {
  prepareClientBootstrap,
  type ClientBootstrapRecoveryResult,
} from '@/services/config/clientBootstrapRecovery';
import { shouldUseStickyIndexedDbFallback } from '@/services/storage/indexeddb/indexedDbRecoveryPolicy';
import { performClientHardReset } from '@/services/storage/core';
import { createScopedLogger } from '@/services/utils/loggerScope';
import type {
  AppBootstrapRuntimeResult,
  BootstrapRuntimeServices,
} from '@/app-shell/bootstrap/bootstrapAppRuntime.types';

const bootstrapRuntimeLogger = createScopedLogger('BootstrapRuntime');

const getErrorMessage = (error: unknown): string =>
  error && typeof error === 'object' && 'message' in error ? String(error.message) : String(error);

const isIndexedDbBootstrapFailure = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  return (
    shouldUseStickyIndexedDbFallback(error) ||
    message.includes('indexeddb.open') ||
    message.includes('backing store') ||
    message.includes('internal error opening backing store')
  );
};

const resolveBlockedBootstrapResult = (
  clientRecovery: ClientBootstrapRecoveryResult,
  error: unknown
): AppBootstrapRuntimeResult => {
  const message = getFirebaseStartupFailureMessage();
  bootstrapRuntimeLogger.error('Firebase bootstrap failed', error);
  return {
    status: 'blocked',
    stage: 'firebase_ready',
    clientRecovery,
    error,
    message,
  };
};

export const reconcileBootstrapRuntime = async (): Promise<ClientBootstrapRecoveryResult> =>
  prepareClientBootstrap();

export const bootstrapAppRuntime = async (): Promise<AppBootstrapRuntimeResult> => {
  const clientRecovery = await reconcileBootstrapRuntime();

  if (clientRecovery.status === 'reload') {
    bootstrapRuntimeLogger.warn('Bootstrap paused for recovery reload', {
      reason: clientRecovery.reason,
    });
    return {
      status: 'reload',
      stage: 'client_recovery',
      clientRecovery,
    };
  }

  try {
    const services = (await firebaseReady) as BootstrapRuntimeServices;
    bootstrapRuntimeLogger.info('Bootstrap runtime ready', {
      recoveryReason: clientRecovery.reason,
    });
    return {
      status: 'continue',
      stage: 'firebase_ready',
      clientRecovery,
      services,
    };
  } catch (error) {
    if (isIndexedDbBootstrapFailure(error)) {
      bootstrapRuntimeLogger.warn('Detected IndexedDB corruption during bootstrap; hard reset');
      await performClientHardReset();
      return {
        status: 'reload',
        stage: 'firebase_ready',
        clientRecovery,
      };
    }

    return resolveBlockedBootstrapResult(clientRecovery, error);
  }
};
