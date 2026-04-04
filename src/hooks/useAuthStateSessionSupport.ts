import { useEffect, useState } from 'react';
import { defaultAuditPort } from '@/application/ports/auditPort';
import { ACTIVITY_EVENTS, SESSION_TIMEOUT_MS } from '@/constants/security';
import { hasRecentManualLogout, markRecentManualLogout } from '@/services/auth/authLogoutState';
import { resolveAuthBootstrapBudget } from '@/services/auth/authBootstrapBudgets';
import { isAuthBootstrapPending } from '@/services/auth/authBootstrapState';
import { createUnauthenticatedAuthSessionState } from '@/services/auth/authSessionState';
import type { AuthSessionState, AuthUser } from '@/types/auth';
import { safeJsonParse } from '@/utils/jsonUtils';
import { authStateLogger } from '@/hooks/hookLoggers';

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

export const getAuthBootstrapTimeoutMs = (): number =>
  resolveAuthBootstrapBudget({
    hasRecentManualLogout: hasRecentManualLogout(),
    isOnline: window.navigator.onLine,
    hasPendingRedirect: isAuthBootstrapPending(),
  }).timeoutMs;
