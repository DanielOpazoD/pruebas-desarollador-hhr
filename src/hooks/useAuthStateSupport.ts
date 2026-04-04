import type { ApplicationOutcome } from '@/application/shared/applicationOutcome';
import { useEffect, useState } from 'react';
import { AuthSessionState, AuthUser } from '@/types/auth';
import { safeJsonParse } from '@/utils/jsonUtils';
import { ACTIVITY_EVENTS, SESSION_TIMEOUT_MS } from '@/constants/security';
import { defaultAuditPort } from '@/application/ports/auditPort';
import {
  clearAuthBootstrapPending,
  getAuthBootstrapPendingAgeMs,
  isAuthBootstrapPending,
  restoreAuthBootstrapReturnTo,
} from '@/services/auth/authBootstrapState';
import {
  clearRecentManualLogout,
  hasRecentManualLogout,
  markRecentManualLogout,
} from '@/services/auth/authLogoutState';
import {
  createUnauthenticatedAuthSessionState,
  isAuthenticatedAuthSessionState,
  toResolvedAuthSessionState,
} from '@/services/auth/authSessionState';
import { authStateLogger } from '@/hooks/hookLoggers';
import {
  recordOperationalOutcome,
  recordOperationalTelemetry,
} from '@/services/observability/operationalTelemetryService';
import { resolveAuthBootstrapBudget } from '@/services/auth/authBootstrapBudgets';
import { hasPersistedFirebaseAuthHint } from '@/services/auth/authStorageHints';

export const getE2EBootstrapUser = (): AuthUser | null => {
  if (typeof window === 'undefined' || !window.__HHR_E2E_OVERRIDE__) {
    return null;
  }

  const storedUser = localStorage.getItem('hhr_e2e_bootstrap_user');
  return safeJsonParse<AuthUser | null>(storedUser, null);
};

export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

export const useFirebaseConnectionStatus = (
  user: AuthUser | null,
  isOnline: boolean,
  hasActiveFirebaseSession: () => boolean
): boolean => {
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  useEffect(() => {
    const checkConnection = () => {
      const hasSession = hasActiveFirebaseSession();
      setIsFirebaseConnected(isOnline && (hasSession || !!user));
    };

    checkConnection();
    const interval = setInterval(checkConnection, 1000);
    const timeout = setTimeout(() => clearInterval(interval), 10000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [user, isOnline, hasActiveFirebaseSession]);

  return isFirebaseConnected;
};

export const createHandleLogout =
  (
    user: AuthUser | null,
    signOut: () => Promise<void>,
    setSessionState: (sessionState: AuthSessionState) => void
  ): ((reason?: 'manual' | 'automatic') => Promise<void>) =>
  async (reason: 'manual' | 'automatic' = 'manual') => {
    if (user?.email) {
      await defaultAuditPort.logUserLogout(user.email, reason);
    }

    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('hhr_logged_this_session');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('hhr_e2e_bootstrap_user');
    }
    if (reason === 'manual') {
      markRecentManualLogout();
    }

    try {
      await signOut();
    } catch (error) {
      authStateLogger.warn('Firebase signOut failed (probably offline)', error);
    }

    setSessionState(createUnauthenticatedAuthSessionState());
  };

export const useInactivityLogout = (
  user: AuthUser | null,
  handleLogout: (reason?: 'manual' | 'automatic') => Promise<void>
): void => {
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        authStateLogger.warn('Logout due to inactivity');
        void handleLogout('automatic');
      }, SESSION_TIMEOUT_MS);
    };

    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, resetTimer);
    });
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, handleLogout]);
};

export const getAuthBootstrapTimeoutMs = (): number => {
  return resolveAuthBootstrapBudget({
    hasRecentManualLogout: hasRecentManualLogout(),
    isOnline: window.navigator.onLine,
    hasPendingRedirect: isAuthBootstrapPending(),
  }).timeoutMs;
};

const applyResolvedBootstrapSessionState = ({
  sessionState,
  setSessionState,
  setAuthLoading,
}: {
  sessionState: AuthSessionState;
  setSessionState: (sessionState: AuthSessionState) => void;
  setAuthLoading: (value: boolean) => void;
}): void => {
  if (isAuthBootstrapPending()) {
    restoreAuthBootstrapReturnTo();
  }
  if (isAuthenticatedAuthSessionState(sessionState)) {
    clearRecentManualLogout();
    if (
      sessionState.user.email &&
      typeof sessionStorage !== 'undefined' &&
      !sessionStorage.getItem('hhr_logged_this_session')
    ) {
      void defaultAuditPort.logUserLogin(sessionState.user.email);
      sessionStorage.setItem('hhr_logged_this_session', 'true');
    }
  }
  setSessionState(sessionState);
  setAuthLoading(false);
  clearAuthBootstrapPending();
};

export const subscribeToResolvedAuthState = async ({
  resolveRedirectAuthSessionOutcome,
  resolveCurrentAuthSessionOutcome,
  onAuthSessionStateChange,
  setSessionState,
  setAuthLoading,
}: {
  resolveRedirectAuthSessionOutcome: () => Promise<ApplicationOutcome<AuthSessionState | null>>;
  resolveCurrentAuthSessionOutcome: () => Promise<ApplicationOutcome<AuthSessionState | null>>;
  onAuthSessionStateChange: (
    callback: (sessionState: AuthSessionState) => void | Promise<void>
  ) => () => void;
  setSessionState: (sessionState: AuthSessionState) => void;
  setAuthLoading: (value: boolean) => void;
}): Promise<() => void> => {
  let isBootstrapLoading = true;

  try {
    const redirectOutcome = await resolveRedirectAuthSessionOutcome();
    recordOperationalOutcome('auth', 'redirect_resolution', redirectOutcome, {
      allowSuccess: true,
    });
    const redirectSessionState = redirectOutcome.data;
    if (redirectSessionState) {
      applyResolvedBootstrapSessionState({
        sessionState: redirectSessionState,
        setSessionState,
        setAuthLoading,
      });
      isBootstrapLoading = false;
    } else {
      const currentSessionOutcome = await resolveCurrentAuthSessionOutcome();
      recordOperationalOutcome('auth', 'current_session_resolution', currentSessionOutcome, {
        allowSuccess: true,
      });
      if (currentSessionOutcome.status === 'success' && currentSessionOutcome.data) {
        applyResolvedBootstrapSessionState({
          sessionState: currentSessionOutcome.data,
          setSessionState,
          setAuthLoading,
        });
        isBootstrapLoading = false;
      }
    }
  } catch (error) {
    authStateLogger.warn('Redirect result check error', error);
    recordOperationalTelemetry({
      category: 'auth',
      operation: 'redirect_resolution_failure',
      status: 'degraded',
      runtimeState: 'recoverable',
      context: {
        isOnline: window.navigator.onLine,
        authBootstrapPending: isAuthBootstrapPending(),
        pendingAgeMs: getAuthBootstrapPendingAgeMs(),
      },
      issues: [error instanceof Error ? error.message : 'No se pudo revisar el redirect de auth.'],
    });
  }

  return onAuthSessionStateChange(async sessionState => {
    recordOperationalTelemetry(
      {
        category: 'auth',
        operation: 'session_state_change',
        status: sessionState.status === 'auth_error' ? 'failed' : 'success',
        context: {
          sessionStatus: sessionState.status,
        },
        issues:
          sessionState.status === 'auth_error' && sessionState.error.userSafeMessage
            ? [sessionState.error.userSafeMessage]
            : undefined,
      },
      { allowSuccess: true }
    );

    if (isAuthenticatedAuthSessionState(sessionState)) {
      if (isAuthBootstrapPending()) {
        restoreAuthBootstrapReturnTo();
      }
      clearRecentManualLogout();
      if (
        sessionState.user.email &&
        typeof sessionStorage !== 'undefined' &&
        !sessionStorage.getItem('hhr_logged_this_session')
      ) {
        void defaultAuditPort.logUserLogin(sessionState.user.email);
        sessionStorage.setItem('hhr_logged_this_session', 'true');
      }
      setSessionState(sessionState);
    } else {
      if (
        isBootstrapLoading &&
        sessionState.status === 'unauthenticated' &&
        !hasRecentManualLogout() &&
        hasPersistedFirebaseAuthHint()
      ) {
        authStateLogger.warn(
          'Ignoring transient unauthenticated auth event while persistence rehydrates'
        );
        return;
      }

      if (hasRecentManualLogout()) {
        clearRecentManualLogout();
        clearAuthBootstrapPending();
        setSessionState(createUnauthenticatedAuthSessionState());
        setAuthLoading(false);
        isBootstrapLoading = false;
        return;
      }
      if (isAuthBootstrapPending() && sessionState.status === 'unauthenticated') {
        return;
      }
      setSessionState(sessionState);
    }

    clearAuthBootstrapPending();
    setAuthLoading(false);
    isBootstrapLoading = false;
  });
};

export const useResolvedAuthBootstrap = ({
  e2eBootstrapUser,
  resolveRedirectAuthSessionOutcome,
  resolveCurrentAuthSessionOutcome,
  onAuthSessionStateChange,
  setSessionState,
  setAuthLoading,
}: {
  e2eBootstrapUser: AuthUser | null;
  resolveRedirectAuthSessionOutcome: () => Promise<ApplicationOutcome<AuthSessionState | null>>;
  resolveCurrentAuthSessionOutcome: () => Promise<ApplicationOutcome<AuthSessionState | null>>;
  onAuthSessionStateChange: (
    callback: (sessionState: AuthSessionState) => void | Promise<void>
  ) => () => void;
  setSessionState: (sessionState: AuthSessionState) => void;
  setAuthLoading: (value: boolean) => void;
}): void => {
  useEffect(() => {
    if (e2eBootstrapUser) {
      setSessionState(toResolvedAuthSessionState(e2eBootstrapUser));
      setAuthLoading(false);
      return;
    }

    let unsubscribe: (() => void) | undefined;
    const bootstrapBudget = resolveAuthBootstrapBudget({
      hasRecentManualLogout: hasRecentManualLogout(),
      isOnline: window.navigator.onLine,
      hasPendingRedirect: isAuthBootstrapPending(),
    });
    const timeoutMs = bootstrapBudget.timeoutMs;
    let isBootstrapResolved = false;
    const safetyTimeout: ReturnType<typeof setTimeout> = setTimeout(() => {
      if (isBootstrapResolved) {
        return;
      }

      authStateLogger.warn(
        `Auth initialization timed out (${timeoutMs}ms) - forcing load completion`,
        {
          isOnline: window.navigator.onLine,
          authBootstrapPending: isAuthBootstrapPending(),
        }
      );
      recordOperationalTelemetry({
        category: 'auth',
        operation: 'bootstrap_timeout',
        status: 'degraded',
        runtimeState: 'recoverable',
        context: {
          timeoutMs,
          budgetProfile: bootstrapBudget.profile,
          pendingAgeMs: getAuthBootstrapPendingAgeMs(),
          isOnline: window.navigator.onLine,
          authBootstrapPending: isAuthBootstrapPending(),
        },
        issues: ['La inicializacion de autenticacion excedio el tiempo esperado.'],
      });

      if (!hasRecentManualLogout() && hasPersistedFirebaseAuthHint()) {
        void resolveCurrentAuthSessionOutcome()
          .then(timeoutRecoveryOutcome => {
            recordOperationalOutcome(
              'auth',
              'timeout_current_session_resolution',
              timeoutRecoveryOutcome,
              {
                allowSuccess: true,
              }
            );

            if (isBootstrapResolved) {
              return;
            }

            if (timeoutRecoveryOutcome.status === 'success' && timeoutRecoveryOutcome.data) {
              applyResolvedBootstrapSessionState({
                sessionState: timeoutRecoveryOutcome.data,
                setSessionState,
                setAuthLoading: setResolvedAuthLoading,
              });
              return;
            }

            clearAuthBootstrapPending();
            setSessionState(createUnauthenticatedAuthSessionState());
            setResolvedAuthLoading(false);
          })
          .catch(error => {
            if (isBootstrapResolved) {
              return;
            }

            authStateLogger.warn('Auth timeout recovery resolution failed', error);
            clearAuthBootstrapPending();
            setSessionState(createUnauthenticatedAuthSessionState());
            setResolvedAuthLoading(false);
          });
        return;
      }

      clearAuthBootstrapPending();
      setSessionState(createUnauthenticatedAuthSessionState());
      setResolvedAuthLoading(false);
    }, timeoutMs);

    const markBootstrapResolved = () => {
      if (isBootstrapResolved) {
        return;
      }

      isBootstrapResolved = true;
      clearTimeout(safetyTimeout);
    };
    const setResolvedAuthLoading = (value: boolean) => {
      if (!value) {
        markBootstrapResolved();
      }
      setAuthLoading(value);
    };

    subscribeToResolvedAuthState({
      resolveRedirectAuthSessionOutcome,
      resolveCurrentAuthSessionOutcome,
      onAuthSessionStateChange,
      setSessionState,
      setAuthLoading: setResolvedAuthLoading,
    }).then(unsub => {
      if (unsub) unsubscribe = unsub;
    });

    return () => {
      markBootstrapResolved();
      if (unsubscribe) unsubscribe();
    };
  }, [
    e2eBootstrapUser,
    resolveRedirectAuthSessionOutcome,
    resolveCurrentAuthSessionOutcome,
    onAuthSessionStateChange,
    setAuthLoading,
    setSessionState,
  ]);
};
