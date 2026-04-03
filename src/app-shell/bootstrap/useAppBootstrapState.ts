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
  if (auth.isLoading) {
    return {
      mode: 'bootstrapping',
      reason: 'auth_loading',
    };
  }

  if (auth.isFirebaseConnected) {
    return {
      mode: 'enabled',
      reason: 'ready',
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
  }, [auth.isFirebaseConnected, auth.isLoading]);
};

export const useAppBootstrapState = (): AppBootstrapState => {
  const auth = useAuth();

  useStorageMigration({ enabled: !auth.isLoading && auth.isAuthenticated });
  useVersionCheck();
  useSyncFirestoreStatus(auth);

  const dateNav = useDateNavigation();
  const { isSignatureMode, currentDateString } = useSignatureMode(
    dateNav.currentDateString,
    auth.currentUser,
    auth.isLoading
  );

  return React.useMemo<AppBootstrapState>(() => {
    if (isSignatureMode) {
      return {
        status: 'signature_mode',
        auth,
      };
    }

    if (auth.isLoading) {
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
  }, [auth, currentDateString, dateNav, isSignatureMode]);
};
