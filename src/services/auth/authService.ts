// Backward-compatible facade. New code should prefer dedicated auth modules and
// `onAuthSessionStateChange` over the legacy `onAuthChange` callback contract.
export type { AuthSessionState, AuthUser, UserRole } from '@/types';
export * from '@/services/auth/authFlow';
export * from '@/services/auth/authPolicy';
export * from '@/services/auth/authSession';
export * from '@/services/auth/authFallback';
