import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  authorizeCurrentFirebaseUser,
  authorizeFirebaseUser,
  resolveFirebaseUserRole,
} from '@/services/auth/authAccessResolution';

const {
  mockFirebaseSignOut,
  mockCheckSharedCensusAccess,
  mockIsSharedCensusMode,
  mockCheckEmailInFirestore,
  mockAuth,
  mockToAuthUser,
} = vi.hoisted(() => ({
  mockFirebaseSignOut: vi.fn().mockResolvedValue(undefined),
  mockCheckSharedCensusAccess: vi.fn(),
  mockIsSharedCensusMode: vi.fn(),
  mockCheckEmailInFirestore: vi.fn(),
  mockAuth: {
    currentUser: null as null | { uid: string; email: string | null; isAnonymous?: boolean },
  },
  mockToAuthUser: vi.fn((user: { uid: string; email: string | null }, role?: string) => ({
    uid: user.uid,
    email: user.email,
    role,
  })),
}));

vi.mock('firebase/auth', () => ({
  signOut: () => mockFirebaseSignOut(),
}));

vi.mock('@/firebaseConfig', () => ({
  auth: mockAuth,
}));

vi.mock('@/services/auth/sharedCensusAuth', () => ({
  checkSharedCensusAccess: (email?: string | null) => mockCheckSharedCensusAccess(email),
  isSharedCensusMode: () => mockIsSharedCensusMode(),
}));

vi.mock('@/services/auth/authPolicy', () => ({
  resolveGeneralLoginAccessForEmail: (email: string) => mockCheckEmailInFirestore(email),
}));

vi.mock('@/services/auth/authShared', () => ({
  toAuthUser: (user: { uid: string; email: string | null }, role?: string) =>
    mockToAuthUser(user, role),
  createAuthError: (code: string, message: string) => Object.assign(new Error(message), { code }),
}));

describe('authAccessResolution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = null;
    mockIsSharedCensusMode.mockReturnValue(false);
    mockCheckSharedCensusAccess.mockResolvedValue({ authorized: false });
    mockCheckEmailInFirestore.mockResolvedValue({
      allowed: true,
      role: 'admin',
      resolution: 'authorized',
    });
  });

  it('authorizes doctor_specialist users in the standard login flow', async () => {
    mockCheckEmailInFirestore.mockResolvedValue({
      allowed: true,
      role: 'doctor_specialist',
      resolution: 'authorized',
    });

    const result = await authorizeFirebaseUser({
      uid: 'spec-1',
      email: 'specialist@hospital.cl',
    } as never);

    expect(result).toEqual({
      uid: 'spec-1',
      email: 'specialist@hospital.cl',
      role: 'doctor_specialist',
    });
    expect(mockFirebaseSignOut).not.toHaveBeenCalled();
  });

  it('signs out unauthorized users in the standard login flow', async () => {
    mockCheckEmailInFirestore.mockResolvedValue({
      allowed: false,
      role: undefined,
      resolution: 'unauthorized',
    });

    await expect(
      authorizeFirebaseUser({
        uid: 'doctor-1',
        email: 'doctor@hospital.cl',
      } as never)
    ).rejects.toThrow(/Acceso no autorizado/i);

    expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);
  });

  it('signs out users with null email in the standard login flow', async () => {
    mockCheckEmailInFirestore.mockResolvedValue({
      allowed: false,
      role: undefined,
      resolution: 'unauthorized',
    });

    await expect(
      authorizeFirebaseUser({
        uid: 'no-email-1',
        email: null,
      } as never)
    ).rejects.toThrow(/Acceso no autorizado/i);

    expect(mockCheckEmailInFirestore).toHaveBeenCalledWith('');
    expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);
  });

  it('rehydrates an authorized current user without exposing an empty shell', async () => {
    mockAuth.currentUser = {
      uid: 'spec-2',
      email: 'specialist@hospital.cl',
      isAnonymous: false,
    };
    mockCheckEmailInFirestore.mockResolvedValue({
      allowed: true,
      role: 'doctor_specialist',
      resolution: 'authorized',
    });

    await expect(authorizeCurrentFirebaseUser()).resolves.toEqual({
      uid: 'spec-2',
      email: 'specialist@hospital.cl',
      role: 'doctor_specialist',
    });
  });

  it('returns null after sign-out when the rehydrated current user no longer has a role', async () => {
    mockAuth.currentUser = {
      uid: 'removed-1',
      email: 'removed@hospital.cl',
      isAnonymous: false,
    };
    mockCheckEmailInFirestore.mockResolvedValue({
      allowed: false,
      role: undefined,
      resolution: 'unauthorized',
    });

    await expect(authorizeCurrentFirebaseUser()).resolves.toBeNull();
    expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);
  });

  it('rehydrates a shared-census current user without consulting general login access', async () => {
    mockAuth.currentUser = {
      uid: 'shared-ok-1',
      email: 'shared@hospital.cl',
      isAnonymous: false,
    };
    mockIsSharedCensusMode.mockReturnValue(true);
    mockCheckSharedCensusAccess.mockResolvedValue({ authorized: true, role: 'viewer' });

    await expect(authorizeCurrentFirebaseUser()).resolves.toEqual({
      uid: 'shared-ok-1',
      email: 'shared@hospital.cl',
      role: 'viewer_census',
    });
    expect(mockCheckEmailInFirestore).not.toHaveBeenCalled();
  });

  it('returns null when a rehydrated shared-census user is no longer authorized', async () => {
    mockAuth.currentUser = {
      uid: 'shared-gone-1',
      email: 'shared-gone@hospital.cl',
      isAnonymous: false,
    };
    mockIsSharedCensusMode.mockReturnValue(true);
    mockCheckSharedCensusAccess.mockResolvedValue({ authorized: false, role: 'viewer' });

    await expect(authorizeCurrentFirebaseUser()).resolves.toBeNull();
    expect(mockCheckEmailInFirestore).not.toHaveBeenCalled();
    expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);
  });

  it('does not authorize shared-census users through the standard login path', async () => {
    mockIsSharedCensusMode.mockReturnValue(true);
    mockCheckSharedCensusAccess.mockResolvedValue({ authorized: false, role: 'viewer' });

    await expect(
      authorizeFirebaseUser({
        uid: 'shared-1',
        email: 'shared@hospital.cl',
      } as never)
    ).rejects.toThrow(/censo compartido/i);

    expect(mockCheckEmailInFirestore).not.toHaveBeenCalled();
    expect(mockFirebaseSignOut).toHaveBeenCalledTimes(1);
  });

  it('reuses the current token role when config lookup is temporarily unavailable', async () => {
    mockCheckEmailInFirestore.mockResolvedValue({
      allowed: false,
      role: undefined,
      resolution: 'unavailable',
    });

    const user = {
      uid: 'fallback-1',
      email: 'fallback@hospital.cl',
      getIdTokenResult: vi.fn().mockResolvedValue({
        claims: { role: 'doctor_specialist' },
      }),
    } as never;

    await expect(authorizeFirebaseUser(user)).resolves.toEqual({
      uid: 'fallback-1',
      email: 'fallback@hospital.cl',
      role: 'doctor_specialist',
    });
    expect(mockFirebaseSignOut).not.toHaveBeenCalled();
  });

  it('does not sign out when role validation is unavailable and no claim fallback exists', async () => {
    mockCheckEmailInFirestore.mockResolvedValue({
      allowed: false,
      role: undefined,
      resolution: 'unavailable',
    });

    await expect(
      authorizeFirebaseUser({
        uid: 'fallback-2',
        email: 'fallback@hospital.cl',
        getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
      } as never)
    ).rejects.toMatchObject({
      code: 'auth/role-validation-unavailable',
    });

    expect(mockFirebaseSignOut).not.toHaveBeenCalled();
  });

  it('rehydrates the role from token claims when backend validation is temporarily unavailable', async () => {
    mockCheckEmailInFirestore.mockResolvedValue({
      allowed: false,
      role: undefined,
      resolution: 'unavailable',
    });

    await expect(
      resolveFirebaseUserRole({
        uid: 'fallback-3',
        email: 'fallback@hospital.cl',
        getIdTokenResult: vi.fn().mockResolvedValue({
          claims: { role: 'doctor_specialist' },
        }),
      } as never)
    ).resolves.toBe('doctor_specialist');
  });
});
