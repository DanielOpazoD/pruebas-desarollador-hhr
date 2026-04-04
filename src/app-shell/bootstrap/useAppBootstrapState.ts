import React from 'react';
import { useDateNavigation, useSignatureMode, useVersionCheck } from '@/hooks';
import type { UseDateNavigationReturn } from '@/hooks/useDateNavigation';
import { useStorageMigration } from '@/hooks/useStorageMigration';
import {
  setFirestoreSyncState,
  type FirestoreSyncState,
} from '@/services/repositories/repositoryConfig';
import { createScopedLogger } from '@/services/utils/loggerScope';
import { useAuth, type AuthContextType } from '@/context';

export interface AppAuthenticatedDateNavigation extends UseDateNavigationReturn {
  isSignatureMode: boolean;
  currentDateString: string;
}

export type AppBootstrapState =
  | {
      status: 'loading';
      auth: AuthContextType;
    }
  | {
      status: 'signature_mode';
      auth: AuthContextType;
    }
  | {
      status: 'unauthenticated';
      auth: AuthContextType;
    }
  | {
      status: 'authenticated';
      auth: AuthContextType;
      dateNav: AppAuthenticatedDateNavigation;
    };

const isIgnorableWorkerShutdownImportError = (error: unknown): boolean => {
  const message = String(error);
  return message.includes('[vitest-worker]: Closing rpc while "fetch" was pending');
};

const appLogger = createScopedLogger('App');

const resolveFirestoreSyncState = (auth: AuthContextType): FirestoreSyncState => {
  if (auth.remoteSyncStatus === 'ready') {
    return {
      mode: 'enabled',
      reason: 'ready',
    };
  }

  if (auth.remoteSyncStatus === 'bootstrapping') {
    return {
      mode: 'bootstrapping',
      reason:
        auth.isLoading || auth.sessionState.status === 'authenticating'
          ? 'auth_loading'
          : 'auth_connecting',
    };
  }

  return {
    mode: 'local_only',
    reason: 'auth_unavailable',
  };
};

const useSyncFirestoreStatus = (auth: AuthContextType) => {
  React.useEffect(() => {
    try {
      setFirestoreSyncState(resolveFirestoreSyncState(auth));
    } catch (error) {
      if (isIgnorableWorkerShutdownImportError(error)) {
        return;
      }
      appLogger.error('Failed to sync Firestore status', error);
    }
  }, [
    auth.isAuthenticated,
    auth.isFirebaseConnected,
    auth.isLoading,
    auth.remoteSyncStatus,
    auth.sessionState.status,
  ]);
};

export const useAppBootstrapState = (): AppBootstrapState => {
  const auth = useAuth();
  const isAuthBootstrapPending = auth.isLoading || auth.sessionState.status === 'authenticating';

  useStorageMigration({ enabled: !isAuthBootstrapPending && auth.isAuthenticated });
  useVersionCheck();
  useSyncFirestoreStatus(auth);

  const dateNav = useDateNavigation();
  const { isSignatureMode, currentDateString } = useSignatureMode(
    dateNav.currentDateString,
    auth.currentUser,
    isAuthBootstrapPending
  );

  return React.useMemo<AppBootstrapState>(() => {
    if (isSignatureMode) {
      return {
        status: 'signature_mode',
        auth,
      };
    }

    if (isAuthBootstrapPending) {
      return {
        status: 'loading',
        auth,
      };
    }

    if (!auth.isAuthenticated) {
      return {
        status: 'unauthenticated',
        auth,
      };
    }

    return {
      status: 'authenticated',
      auth,
      dateNav: {
        ...dateNav,
        isSignatureMode,
        currentDateString,
      },
    };
  }, [auth, currentDateString, dateNav, isAuthBootstrapPending, isSignatureMode]);
};
