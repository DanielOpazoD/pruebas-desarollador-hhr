import { useMemo, useState } from 'react';
import {
  onAuthSessionStateChange,
  signOut,
  hasActiveFirebaseSession,
} from '@/services/auth/authService';
import { executeRedirectAuthResolution } from '@/application/auth';
import { AuthSessionState, AuthUser, UserRole } from '@/types';
export type { AuthSessionState, UserRole };
import { canEditAnyModule } from '@/utils/permissions';
import {
  createHandleLogout,
  getE2EBootstrapUser,
  useFirebaseConnectionStatus,
  useInactivityLogout,
  useOnlineStatus,
  useResolvedAuthBootstrap,
} from '@/hooks/useAuthStateSupport';
import { hasRecentManualLogout } from '@/services/auth/authLogoutState';
import {
  createAuthenticatingAuthSessionState,
  createUnauthenticatedAuthSessionState,
  getAuthSessionStateUser,
  toResolvedAuthSessionState,
} from '@/services/auth/authSessionState';

// UserRole and AuthUser are now imported from @/types

/**
 * Return type for the useAuthState hook.
 * Provides user authentication state, role information, and auth actions.
 */
export interface UseAuthStateReturn {
  /** Canonical authentication session state */
  sessionState: AuthSessionState;
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
  /** True if user has edit permissions in at least one module */
  isEditor: boolean;
  /** True if user only has view permissions */
  isViewer: boolean;
  /** Alias for isEditor - true if user can modify data */
  canEdit: boolean;
}

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
  const [sessionState, setSessionState] = useState<AuthSessionState>(() => {
    if (e2eBootstrapUser) {
      return toResolvedAuthSessionState(e2eBootstrapUser);
    }

    return hasRecentManualLogout() && !hasActiveFirebaseSession()
      ? createUnauthenticatedAuthSessionState()
      : createAuthenticatingAuthSessionState();
  });
  const user = getAuthSessionStateUser(sessionState);
  const [authLoading, setAuthLoading] = useState(
    !e2eBootstrapUser && !(hasRecentManualLogout() && !hasActiveFirebaseSession())
  );
  const isOnline = useOnlineStatus();
  const handleLogout = useMemo(() => createHandleLogout(user, signOut, setSessionState), [user]);
  const isFirebaseConnected = useFirebaseConnectionStatus(user, isOnline, hasActiveFirebaseSession);

  useInactivityLogout(user, handleLogout);
  useResolvedAuthBootstrap({
    e2eBootstrapUser,
    resolveRedirectAuthSessionOutcome: executeRedirectAuthResolution,
    onAuthSessionStateChange,
    setSessionState,
    setAuthLoading,
  });

  const role: UserRole = user?.role || 'viewer';
  const isEditor = canEditAnyModule(role);
  const isViewer = !isEditor;
  const canEdit = isEditor;

  return {
    sessionState,
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
