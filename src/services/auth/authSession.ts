import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { AuthSessionState, AuthUser } from '@/types';
import { checkSharedCensusAccess, isSharedCensusMode } from '@/services/auth/sharedCensusAuth';
import { clearRoleCacheForEmail } from '@/services/auth/authPolicy';
import { toAuthUser } from '@/services/auth/authShared';
import { resolveFirebaseUserRole } from '@/services/auth/authAccessResolution';
import { resolveAuthSessionState } from '@/services/auth/authSessionController';
import { recordAuthOperationalError } from '@/services/auth/authOperationalTelemetry';
import { ensureUserRoleClaim } from '@/services/auth/authClaimSyncService';
import {
  createAuthErrorSessionState,
  createUnauthenticatedAuthSessionState,
  createUnauthorizedAuthSessionState,
  toAnonymousSignatureAuthSessionState,
  toLegacyAuthUserFromSessionState,
} from '@/services/auth/authSessionState';

export const signOut = async (): Promise<void> => {
  const userEmail = auth.currentUser?.email;
  await firebaseSignOut(auth);

  if (userEmail) {
    try {
      await clearRoleCacheForEmail(userEmail);
    } catch (error) {
      recordAuthOperationalError('sign_out_clear_role_cache', error, {
        code: 'auth_role_cache_clear_failed',
        message: 'Failed to clear role cache on sign out.',
        severity: 'warning',
        userSafeMessage: 'La sesión se cerró, pero no se pudo limpiar el cache de roles.',
        context: {
          email: userEmail,
        },
      });
    }
  }
};

export const onAuthSessionStateChange = (
  callback: (sessionState: AuthSessionState) => void | Promise<void>
): (() => void) => {
  return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      await callback(createUnauthenticatedAuthSessionState());
      return;
    }

    if (firebaseUser.isAnonymous) {
      await callback(
        toAnonymousSignatureAuthSessionState({
          uid: firebaseUser.uid,
          email: null,
          displayName: 'Anonymous Doctor',
          role: 'viewer',
        })
      );
      return;
    }

    try {
      const sessionState = await resolveAuthSessionState(firebaseUser, {
        isSharedCensusMode,
        checkSharedCensusAccess,
        signOutUnauthorizedUser: () => firebaseSignOut(auth),
        resolveFirebaseUserRole,
      });
      if (sessionState.status === 'authorized' && sessionState.user.role) {
        await ensureUserRoleClaim(firebaseUser, sessionState.user.role);
      }
      await callback(sessionState);
    } catch (error) {
      const operationalError = recordAuthOperationalError('on_auth_session_state_change', error, {
        code: 'auth_session_state_resolution_failed',
        message: 'Failed to resolve authentication session state.',
        severity: 'warning',
        userSafeMessage: 'No se pudo resolver la sesión actual.',
      });
      await callback(
        createAuthErrorSessionState({
          code: operationalError.code,
          message: operationalError.message,
          userSafeMessage: operationalError.userSafeMessage,
          severity: operationalError.severity === 'error' ? 'error' : 'warning',
          technicalContext: operationalError.context,
          telemetryTags: ['auth', 'session_state'],
        })
      );
    }
  });
};

/**
 * @deprecated Prefer `onAuthSessionStateChange` so consumers can distinguish
 * unauthenticated, unauthorized, anonymous signature and auth error states.
 */
export const onAuthChange = (callback: (user: AuthUser | null) => void): (() => void) => {
  return onAuthSessionStateChange(async sessionState => {
    if (sessionState.status === 'unauthorized' || sessionState.status === 'auth_error') {
      callback(null);
      return;
    }

    callback(toLegacyAuthUserFromSessionState(sessionState));
  });
};

export const getCurrentAuthSessionState = (): AuthSessionState => {
  const user = auth.currentUser;
  if (!user) {
    return createUnauthenticatedAuthSessionState();
  }

  if (user.isAnonymous) {
    return toAnonymousSignatureAuthSessionState({
      uid: user.uid,
      email: null,
      displayName: 'Anonymous Doctor',
      role: 'viewer',
    });
  }

  return createUnauthorizedAuthSessionState('session_requires_resolution', {
    email: user.email,
  });
};

export const getCurrentUser = (): AuthUser | null => {
  const sessionUser = toLegacyAuthUserFromSessionState(getCurrentAuthSessionState());
  if (sessionUser) {
    return sessionUser;
  }

  const user = auth.currentUser;
  return user ? toAuthUser(user) : null;
};
