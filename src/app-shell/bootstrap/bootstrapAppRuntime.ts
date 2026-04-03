import { firebaseReady } from '@/firebaseConfig';
import { getFirebaseStartupFailureMessage } from '@/services/auth/firebaseStartupUiPolicy';
import {
  prepareClientBootstrap,
  type ClientBootstrapRecoveryResult,
} from '@/services/config/clientBootstrapRecovery';
import { createScopedLogger } from '@/services/utils/loggerScope';
import type {
  AppBootstrapRuntimeResult,
  BootstrapRuntimeServices,
} from '@/app-shell/bootstrap/bootstrapAppRuntime.types';

const bootstrapRuntimeLogger = createScopedLogger('BootstrapRuntime');

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
    return resolveBlockedBootstrapResult(clientRecovery, error);
  }
};
