import type { User } from 'firebase/auth';

import type { AuthSessionState, AuthUser } from '@/types';
import { toAuthUser } from '@/services/auth/authShared';
import {
  createUnauthorizedAuthSessionState,
  toAnonymousSignatureAuthSessionState,
  toResolvedAuthSessionState,
} from '@/services/auth/authSessionState';

export const toAnonymousAuthUser = (firebaseUser: User): AuthUser => ({
  uid: firebaseUser.uid,
  email: null,
  displayName: 'Anonymous Doctor',
  role: 'viewer',
});

export const resolveAuthSessionState = async (
  firebaseUser: User,
  dependencies: {
    isSharedCensusMode(): boolean;
    checkSharedCensusAccess(email: string | null): Promise<{ authorized: boolean }>;
    signOutUnauthorizedUser(): Promise<void>;
    resolveFirebaseUserRole(user: User): Promise<AuthUser['role'] | null>;
  }
): Promise<AuthSessionState> => {
  if (firebaseUser.isAnonymous) {
    return toAnonymousSignatureAuthSessionState(toAnonymousAuthUser(firebaseUser));
  }

  if (dependencies.isSharedCensusMode()) {
    const sharedAccess = await dependencies.checkSharedCensusAccess(firebaseUser.email);
    if (!sharedAccess.authorized) {
      await dependencies.signOutUnauthorizedUser();
      return createUnauthorizedAuthSessionState('shared_census_access_denied', {
        email: firebaseUser.email,
      });
    }
    return toResolvedAuthSessionState(toAuthUser(firebaseUser, 'viewer_census'));
  }

  const role = await dependencies.resolveFirebaseUserRole(firebaseUser);
  if (!role) {
    await dependencies.signOutUnauthorizedUser();
    return createUnauthorizedAuthSessionState('role_not_resolved', {
      email: firebaseUser.email,
    });
  }

  return toResolvedAuthSessionState(toAuthUser(firebaseUser, role));
};

export const resolveAuthSessionUser = async (
  firebaseUser: User,
  dependencies: {
    isSharedCensusMode(): boolean;
    checkSharedCensusAccess(email: string | null): Promise<{ authorized: boolean }>;
    signOutUnauthorizedUser(): Promise<void>;
    resolveFirebaseUserRole(user: User): Promise<AuthUser['role'] | null>;
  }
): Promise<AuthUser | null> => {
  const sessionState = await resolveAuthSessionState(firebaseUser, dependencies);
  return sessionState.user;
};
