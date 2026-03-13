import {
  getAuthRedirectEnvironment,
  resolveAuthRedirectEnvironment,
} from '@/services/auth/authRedirectEnvironment';
import {
  buildAuthRedirectRuntimeSupport,
  type AuthRedirectRuntimeSupport,
} from '@/services/auth/authRedirectSupportController';

export type { AuthRedirectRuntimeSupport } from '@/services/auth/authRedirectSupportController';

export const resolveAuthRedirectRuntimeSupport = (
  hostname: string,
  preferRedirectOnLocalhost: boolean,
  authDomain: string | undefined
): AuthRedirectRuntimeSupport =>
  buildAuthRedirectRuntimeSupport(
    resolveAuthRedirectEnvironment(hostname, preferRedirectOnLocalhost, authDomain)
  );

export const getAuthRedirectRuntimeSupport = (): AuthRedirectRuntimeSupport =>
  buildAuthRedirectRuntimeSupport(getAuthRedirectEnvironment());
