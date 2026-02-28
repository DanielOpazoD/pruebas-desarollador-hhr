import { useState, useEffect, useCallback } from 'react';
import {
  onAuthChange,
  signOut,
  hasActiveFirebaseSession,
  handleSignInRedirectResult,
} from '@/services/auth/authService';
import { AuthUser, UserRole } from '@/types';
export type { UserRole };
import { logUserLogout, logUserLogin } from '@/services/admin/auditService';
import { safeJsonParse } from '@/utils/jsonUtils';
import {
  clearAuthBootstrapPending,
  isAuthBootstrapPending,
} from '@/services/auth/authBootstrapState';

// UserRole and AuthUser are now imported from @/types

/**
 * Return type for the useAuthState hook.
 * Provides user authentication state, role information, and auth actions.
 */
export interface UseAuthStateReturn {
  /** Current authenticated user or null if not logged in */
  user: AuthUser | null;
  /** True while authentication state is being determined */
  authLoading: boolean;
  /** True if connected to Firebase (either real or anonymous auth) */
  isFirebaseConnected: boolean;
  /** Signs out the current user */
  handleLogout: (reason?: 'manual' | 'automatic') => Promise<void>;

  // Role-based properties
  /** Current user's role */
  role: UserRole;
  /** True if user has edit permissions (editor, admin, or nurse_hospital) */
  isEditor: boolean;
  /** True if user only has view permissions */
  isViewer: boolean;
  /** Alias for isEditor - true if user can modify data */
  canEdit: boolean;
}

import { SESSION_TIMEOUT_MS, ACTIVITY_EVENTS } from '@/constants/security';

const getE2EBootstrapUser = (): AuthUser | null => {
  if (typeof window === 'undefined' || !window.__HHR_E2E_OVERRIDE__) {
    return null;
  }

  const storedUser = localStorage.getItem('hhr_e2e_bootstrap_user');
  return safeJsonParse<AuthUser | null>(storedUser, null);
};

/**
 * useAuthState Hook
 *
 * Central hook for managing authentication state throughout the application.
 * Supports Firebase auth plus anonymous signature-mode access.
 * Firebase connection status is monitored to enable/disable sync features.
 *
 * @returns Authentication state, user info, role flags, and auth actions
 */
export const useAuthState = (): UseAuthStateReturn => {
  const [e2eBootstrapUser] = useState<AuthUser | null>(() => getE2EBootstrapUser());
  const [user, setUser] = useState<AuthUser | null>(e2eBootstrapUser);
  const [authLoading, setAuthLoading] = useState(!e2eBootstrapUser);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

  // ========================================================================
  // Authentication Actions
  // ========================================================================

  /**
   * Performs a full sign-out of the current Firebase session.
   *
   * @param reason - Whether the logout was 'manual' (user clicked) or 'automatic' (session timeout).
   */
  const handleLogout = useCallback(
    async (reason: 'manual' | 'automatic' = 'manual') => {
      // Log the logout event before clearing data
      if (user?.email) {
        await logUserLogout(user.email, reason);
      }

      // Reset login flag for audit tracking
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('hhr_logged_this_session');
      }
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('hhr_e2e_bootstrap_user');
      }

      // Firebase sign out (may fail if offline, that's ok)
      try {
        await signOut();
      } catch (error) {
        console.warn('[useAuthState] Firebase signOut failed (probably offline):', error);
      }

      setUser(null);
    },
    [user]
  );

  // ========================================================================
  // Inactivity Detection (MINSAL Requirement)
  // ========================================================================
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.warn('[useAuthState] Logout due to inactivity');
        handleLogout('automatic');
      }, SESSION_TIMEOUT_MS);
    };

    // Add activity listeners
    ACTIVITY_EVENTS.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Initial timer start
    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      ACTIVITY_EVENTS.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, handleLogout]);

  // Network status listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (e2eBootstrapUser) return;

    const initAuth = async () => {
      try {
        const redirectUser = await handleSignInRedirectResult();
        if (redirectUser) {
          setUser(redirectUser);
          setAuthLoading(false);
          clearAuthBootstrapPending();
        }
      } catch (error) {
        console.warn('[useAuthState] Redirect result check error:', error);
      }

      const unsubscribe = onAuthChange(async authUser => {
        if (authUser) {
          if (authUser.email) {
            if (
              typeof sessionStorage !== 'undefined' &&
              !sessionStorage.getItem('hhr_logged_this_session')
            ) {
              logUserLogin(authUser.email);
              sessionStorage.setItem('hhr_logged_this_session', 'true');
            }
          }
          setUser(authUser);
        } else {
          if (isAuthBootstrapPending()) {
            return;
          }
          setUser(null);
        }

        clearAuthBootstrapPending();
        setAuthLoading(false);
      });

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;

    // Safety timeout: If Firebase takes too long (e.g. network issues), stop loading
    // Shorter timeout if we're already offline to show LoginPage faster
    const timeoutMs = window.navigator.onLine ? (isAuthBootstrapPending() ? 45000 : 15000) : 5000;
    const safetyTimeout = setTimeout(() => {
      console.warn(
        `[useAuthState] ⚠️ Auth initialization timed out (${timeoutMs}ms) - forcing load completion`
      );
      clearAuthBootstrapPending();
      setAuthLoading(false);
    }, timeoutMs);

    initAuth().then(unsub => {
      if (unsub) unsubscribe = unsub;
    });

    return () => {
      // console.debug('[useAuthState] 🧹 Cleaning up Auth subscription');
      clearTimeout(safetyTimeout);
      if (unsubscribe) unsubscribe();
    };
  }, [e2eBootstrapUser]);

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
  }, [user, isOnline]);

  const role: UserRole = user?.role || 'viewer';
  const isEditor = role === 'editor' || role === 'admin' || role === 'nurse_hospital';
  const isViewer = !isEditor;
  const canEdit = isEditor;

  return {
    user,
    authLoading,
    isFirebaseConnected,
    handleLogout,
    role,
    isEditor,
    isViewer,
    canEdit,
  };
};
