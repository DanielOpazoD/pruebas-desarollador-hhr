export type AuthRedirectRuntimeSupport = {
  isLocalhostRuntime: boolean;
  preferRedirectOnLocalhost: boolean;
  canUseRedirectAuth: boolean;
  redirectDisabledReason: string | null;
};

const isLocalhostHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1';

export const getAuthRedirectRuntimeSupport = (): AuthRedirectRuntimeSupport => {
  const hostname = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
  const isLocalhostRuntime = isLocalhostHost(hostname);
  const preferRedirectOnLocalhost =
    String(import.meta.env.VITE_AUTH_PREFER_REDIRECT_ON_LOCALHOST || 'false').toLowerCase() ===
    'true';
  const authDomain = String(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim();

  if (isLocalhostRuntime && !preferRedirectOnLocalhost) {
    return {
      isLocalhostRuntime,
      preferRedirectOnLocalhost,
      canUseRedirectAuth: false,
      redirectDisabledReason:
        'El acceso alternativo por redirección está deshabilitado en localhost para evitar bucles con la configuración actual de Firebase Auth.',
    };
  }

  if (!authDomain) {
    return {
      isLocalhostRuntime,
      preferRedirectOnLocalhost,
      canUseRedirectAuth: false,
      redirectDisabledReason:
        'Falta el authDomain de Firebase. No es posible iniciar por redirección.',
    };
  }

  return {
    isLocalhostRuntime,
    preferRedirectOnLocalhost,
    canUseRedirectAuth: true,
    redirectDisabledReason: null,
  };
};
