// Backward-compatible facade. New code should prefer dedicated auth modules and
// `AuthSessionState`-based consumers over this aggregate surface.
export type { AuthSessionState, AuthUser, UserRole } from '@/types/auth';
export * from '@/services/auth/authFlow';
export * from '@/services/auth/authPolicy';
export {
  signOut,
  onAuthSessionStateChange,
  getCurrentAuthSessionState,
} from '@/services/auth/authSession';
export {
  hasActiveFirebaseSession,
  handleSignInRedirectResult,
  signInWithGoogleRedirect,
} from '@/services/auth/authFallback';
