import type { User } from 'firebase/auth';

import type { AuthUser } from '@/types';
import { toAuthUser } from '@/services/auth/authShared';

export const toAnonymousAuthUser = (firebaseUser: User): AuthUser => ({
  uid: firebaseUser.uid,
  email: null,
  displayName: 'Anonymous Doctor',
  role: 'viewer',
});

export const resolveAuthSessionUser = async (
  firebaseUser: User,
  dependencies: {
    isSharedCensusMode(): boolean;
    checkSharedCensusAccess(email: string | null): Promise<{ authorized: boolean }>;
    signOutUnauthorizedUser(): Promise<void>;
    resolveFirebaseUserRole(user: User): Promise<AuthUser['role']>;
  }
): Promise<AuthUser | null> => {
  if (firebaseUser.isAnonymous) {
    return toAnonymousAuthUser(firebaseUser);
  }

  if (dependencies.isSharedCensusMode()) {
    const sharedAccess = await dependencies.checkSharedCensusAccess(firebaseUser.email);
    if (!sharedAccess.authorized) {
      await dependencies.signOutUnauthorizedUser();
      return null;
    }
    return toAuthUser(firebaseUser, 'viewer_census');
  }

  const role = await dependencies.resolveFirebaseUserRole(firebaseUser);
  return toAuthUser(firebaseUser, role);
};
