import { getFirebaseAuthConfigStatus } from '@/services/auth/firebaseAuthConfigPolicy';

export interface AuthRedirectEnvironment {
  hostname: string;
  isLocalhostRuntime: boolean;
  preferRedirectOnLocalhost: boolean;
  firebaseAuthConfig: ReturnType<typeof getFirebaseAuthConfigStatus>;
}

export const isLocalhostHost = (hostname: string): boolean =>
  hostname === 'localhost' || hostname === '127.0.0.1';

export const resolveAuthRedirectEnvironment = (
  hostname: string,
  preferRedirectOnLocalhost: boolean,
  authDomain: string | undefined
): AuthRedirectEnvironment => {
  const normalizedHostname = String(hostname || '').toLowerCase();

  return {
    hostname: normalizedHostname,
    isLocalhostRuntime: isLocalhostHost(normalizedHostname),
    preferRedirectOnLocalhost,
    firebaseAuthConfig: getFirebaseAuthConfigStatus(authDomain),
  };
};

export const getAuthRedirectEnvironment = (): AuthRedirectEnvironment =>
  resolveAuthRedirectEnvironment(
    typeof window !== 'undefined' ? window.location.hostname : '',
    String(import.meta.env.VITE_AUTH_PREFER_REDIRECT_ON_LOCALHOST || 'false').toLowerCase() ===
      'true',
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
  );
