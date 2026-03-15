import { describe, expect, it, vi } from 'vitest';

import {
  resolveAuthSessionState,
  resolveAuthSessionUser,
  toAnonymousAuthUser,
} from '@/services/auth/authSessionController';

describe('authSessionController', () => {
  it('maps anonymous users to viewer auth users', () => {
    expect(
      toAnonymousAuthUser({
        uid: 'anon-1',
      } as never)
    ).toEqual({
      uid: 'anon-1',
      email: null,
      displayName: 'Anonymous Doctor',
      role: 'viewer',
    });
  });

  it('returns viewer_census for authorized shared-census users', async () => {
    const resolveFirebaseUserRole = vi.fn().mockResolvedValue('admin');

    const result = await resolveAuthSessionUser(
      {
        uid: 'user-1',
        email: 'shared@hospital.cl',
        isAnonymous: false,
        displayName: 'Shared User',
        photoURL: null,
      } as never,
      {
        isSharedCensusMode: () => true,
        checkSharedCensusAccess: vi.fn().mockResolvedValue({ authorized: true }),
        signOutUnauthorizedUser: vi.fn(),
        resolveFirebaseUserRole,
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        uid: 'user-1',
        role: 'viewer_census',
      })
    );
    expect(resolveFirebaseUserRole).not.toHaveBeenCalled();
  });

  it('returns explicit session state for anonymous signature users', async () => {
    const result = await resolveAuthSessionState(
      {
        uid: 'anon-signature',
        email: null,
        isAnonymous: true,
      } as never,
      {
        isSharedCensusMode: () => false,
        checkSharedCensusAccess: vi.fn(),
        signOutUnauthorizedUser: vi.fn(),
        resolveFirebaseUserRole: vi.fn(),
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: 'anonymous_signature',
        user: expect.objectContaining({
          uid: 'anon-signature',
          role: 'viewer',
        }),
      })
    );
  });

  it('signs out unauthorized shared-census users', async () => {
    const signOutUnauthorizedUser = vi.fn().mockResolvedValue(undefined);

    const result = await resolveAuthSessionUser(
      {
        uid: 'user-2',
        email: 'blocked@hospital.cl',
        isAnonymous: false,
      } as never,
      {
        isSharedCensusMode: () => true,
        checkSharedCensusAccess: vi.fn().mockResolvedValue({ authorized: false }),
        signOutUnauthorizedUser,
        resolveFirebaseUserRole: vi.fn(),
      }
    );

    expect(result).toBeNull();
    expect(signOutUnauthorizedUser).toHaveBeenCalledTimes(1);
  });

  it('signs out unauthorized standard users before building an app session', async () => {
    const signOutUnauthorizedUser = vi.fn().mockResolvedValue(undefined);

    const result = await resolveAuthSessionUser(
      {
        uid: 'user-3',
        email: 'removed@hospital.cl',
        isAnonymous: false,
      } as never,
      {
        isSharedCensusMode: () => false,
        checkSharedCensusAccess: vi.fn(),
        signOutUnauthorizedUser,
        resolveFirebaseUserRole: vi.fn().mockResolvedValue(null),
      }
    );

    expect(result).toBeNull();
    expect(signOutUnauthorizedUser).toHaveBeenCalledTimes(1);
  });

  it('returns unauthorized session state for removed users', async () => {
    const signOutUnauthorizedUser = vi.fn().mockResolvedValue(undefined);

    const result = await resolveAuthSessionState(
      {
        uid: 'user-unauthorized',
        email: 'removed@hospital.cl',
        isAnonymous: false,
      } as never,
      {
        isSharedCensusMode: () => false,
        checkSharedCensusAccess: vi.fn(),
        signOutUnauthorizedUser,
        resolveFirebaseUserRole: vi.fn().mockResolvedValue(null),
      }
    );

    expect(result).toEqual(
      expect.objectContaining({
        status: 'unauthorized',
        user: null,
        reason: 'role_not_resolved',
      })
    );
    expect(signOutUnauthorizedUser).toHaveBeenCalledTimes(1);
  });

  it('signs out when shared-census mode is active but the user email is missing', async () => {
    const signOutUnauthorizedUser = vi.fn().mockResolvedValue(undefined);

    const result = await resolveAuthSessionUser(
      {
        uid: 'user-4',
        email: null,
        isAnonymous: false,
      } as never,
      {
        isSharedCensusMode: () => true,
        checkSharedCensusAccess: vi.fn().mockResolvedValue({ authorized: false }),
        signOutUnauthorizedUser,
        resolveFirebaseUserRole: vi.fn(),
      }
    );

    expect(result).toBeNull();
    expect(signOutUnauthorizedUser).toHaveBeenCalledTimes(1);
  });
});
