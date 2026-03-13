import { AUTH_UI_COPY } from '@/services/auth/authUiCopy';
import type { AuthRedirectEnvironment } from '@/services/auth/authRedirectEnvironment';

export type AuthRedirectRuntimeSupport = {
  isLocalhostRuntime: boolean;
  preferRedirectOnLocalhost: boolean;
  canUseRedirectAuth: boolean;
  supportLevel: 'disabled' | 'warning' | 'ready';
  redirectDisabledReason: string | null;
  supportSummary: string | null;
  supportAction: string | null;
  recommendedFlowLabel: string;
  authDomain: string;
  usesFirebaseHostedAuthDomain: boolean;
};

export const buildAuthRedirectRuntimeSupport = (
  environment: AuthRedirectEnvironment
): AuthRedirectRuntimeSupport => {
  const { isLocalhostRuntime, preferRedirectOnLocalhost, firebaseAuthConfig } = environment;

  if (isLocalhostRuntime && !preferRedirectOnLocalhost) {
    return {
      isLocalhostRuntime,
      preferRedirectOnLocalhost,
      canUseRedirectAuth: false,
      supportLevel: 'disabled',
      redirectDisabledReason:
        'En este equipo el acceso alternativo está desactivado para evitar bucles de acceso en el navegador.',
      supportSummary:
        'En localhost el sistema prefiere la ventana normal de Google y evita cambiar de pestaña automáticamente.',
      supportAction:
        'Si la ventana no aparece, usa el botón principal otra vez o revisa si el navegador bloqueó ventanas emergentes.',
      recommendedFlowLabel: 'Ventana de Google',
      authDomain: firebaseAuthConfig.authDomain,
      usesFirebaseHostedAuthDomain: firebaseAuthConfig.usesFirebaseHostedAuthDomain,
    };
  }

  if (!firebaseAuthConfig.canAttemptRedirectAuth) {
    return {
      isLocalhostRuntime,
      preferRedirectOnLocalhost,
      canUseRedirectAuth: false,
      supportLevel: firebaseAuthConfig.redirectSupportLevel,
      redirectDisabledReason: firebaseAuthConfig.redirectBlockedReason,
      supportSummary: firebaseAuthConfig.supportSummary,
      supportAction: firebaseAuthConfig.supportAction,
      recommendedFlowLabel: AUTH_UI_COPY.alternateAccessButton,
      authDomain: firebaseAuthConfig.authDomain,
      usesFirebaseHostedAuthDomain: firebaseAuthConfig.usesFirebaseHostedAuthDomain,
    };
  }

  return {
    isLocalhostRuntime,
    preferRedirectOnLocalhost,
    canUseRedirectAuth: true,
    supportLevel: firebaseAuthConfig.redirectSupportLevel,
    redirectDisabledReason: null,
    supportSummary: firebaseAuthConfig.supportSummary,
    supportAction: firebaseAuthConfig.supportAction,
    recommendedFlowLabel: AUTH_UI_COPY.alternateAccessButton,
    authDomain: firebaseAuthConfig.authDomain,
    usesFirebaseHostedAuthDomain: firebaseAuthConfig.usesFirebaseHostedAuthDomain,
  };
};
