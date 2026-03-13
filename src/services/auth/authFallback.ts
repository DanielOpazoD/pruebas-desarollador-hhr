import { getRedirectResult, signInWithRedirect } from 'firebase/auth';
import { auth } from '@/firebaseConfig';
import { AuthUser } from '@/types';
import {
  consumeE2ERedirectPendingUser,
  googleProvider,
  readE2ERedirectMode,
} from '@/services/auth/authShared';
import {
  clearAuthBootstrapPending,
  markAuthBootstrapPending,
} from '@/services/auth/authBootstrapState';
import { authorizeFirebaseUser } from '@/services/auth/authAccessResolution';
import { getAuthRedirectRuntimeSupport } from '@/services/auth/authRedirectRuntime';
import { AUTH_UI_COPY } from '@/services/auth/authUiCopy';
import { createOperationalError } from '@/services/observability/operationalError';
import { recordOperationalErrorTelemetry } from '@/services/observability/operationalTelemetryService';

const runE2ERedirectMode = async (mode: 'success' | 'error' | 'timeout'): Promise<void> => {
  if (mode === 'error') {
    throw new Error('E2E redirect failed');
  }

  if (mode === 'timeout') {
    await new Promise((_, reject) => {
      setTimeout(() => reject(new Error('E2E redirect timeout')), 1200);
    });
    return;
  }

  markAuthBootstrapPending('redirect');
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem(
      'hhr_e2e_redirect_pending_user',
      JSON.stringify({
        uid: 'e2e-redirect-user',
        email: 'e2e.redirect@hospital.cl',
        displayName: 'E2E Redirect User',
        role: 'admin',
      })
    );
  }
};

export const hasActiveFirebaseSession = (): boolean => auth.currentUser !== null;

export const signInWithGoogleRedirect = async (): Promise<void> => {
  try {
    const redirectRuntimeSupport = getAuthRedirectRuntimeSupport();
    if (!redirectRuntimeSupport.canUseRedirectAuth) {
      throw createOperationalError({
        code: 'auth_redirect_unavailable',
        message: redirectRuntimeSupport.redirectDisabledReason || AUTH_UI_COPY.redirectUnavailable,
        severity: 'warning',
        userSafeMessage:
          redirectRuntimeSupport.redirectDisabledReason || AUTH_UI_COPY.redirectUnavailable,
        context: {
          canUseRedirectAuth: redirectRuntimeSupport.canUseRedirectAuth,
        },
      });
    }

    const e2eRedirectMode = readE2ERedirectMode();
    if (e2eRedirectMode) {
      await runE2ERedirectMode(e2eRedirectMode);
      return;
    }

    markAuthBootstrapPending('redirect');
    await signInWithRedirect(auth, googleProvider);
  } catch (error) {
    const operationalError = recordOperationalErrorTelemetry(
      'auth',
      'sign_in_google_redirect',
      error,
      {
        code: 'auth_redirect_start_failed',
        message: AUTH_UI_COPY.redirectUnavailable,
        severity: 'error',
        userSafeMessage: AUTH_UI_COPY.redirectUnavailable,
      },
      {
        context: {
          hasActiveFirebaseSession: hasActiveFirebaseSession(),
        },
      }
    );
    throw operationalError;
  }
};

export const handleSignInRedirectResult = async (): Promise<AuthUser | null> => {
  try {
    const e2eRedirectUser = consumeE2ERedirectPendingUser();
    if (e2eRedirectUser) {
      return e2eRedirectUser;
    }

    const result = await getRedirectResult(auth);
    if (!result) return null;
    return await authorizeFirebaseUser(result.user);
  } catch (error) {
    recordOperationalErrorTelemetry('auth', 'handle_sign_in_redirect_result', error, {
      code: 'auth_redirect_result_failed',
      message: 'No se pudo completar el retorno del acceso con Google.',
      severity: 'warning',
      userSafeMessage: 'No se pudo completar el retorno del acceso con Google.',
    });
    return null;
  } finally {
    clearAuthBootstrapPending();
  }
};
