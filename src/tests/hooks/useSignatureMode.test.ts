import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSignatureMode } from '@/hooks/useSignatureMode';
import { signInAnonymously } from 'firebase/auth';
import type { AuthUser } from '@/services/auth/authService';

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  signInAnonymously: vi.fn().mockResolvedValue({ user: { uid: 'anon-123' } }),
  getAuth: vi.fn(() => ({})),
}));

// Mock Firebase Config
vi.mock('../../firebaseConfig', () => ({
  auth: { currentUser: null },
}));

describe('useSignatureMode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL parameters
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/?mode=signature'),
      writable: true,
      configurable: true,
    });
  });

  it('should sign in anonymously if in signature mode and no user is present', () => {
    renderHook(() => useSignatureMode('2024-12-28', null, false));

    expect(signInAnonymously).toHaveBeenCalled();
  });

  it('should NOT sign in anonymously if a user is already present', () => {
    const mockAdminUser: AuthUser = { uid: 'admin-1', email: 'admin@hhr.cl', displayName: 'Admin' };
    renderHook(() => useSignatureMode('2024-12-28', mockAdminUser, false));

    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('should NOT sign in anonymously if auth is loading', () => {
    renderHook(() => useSignatureMode('2024-12-28', null, true));

    expect(signInAnonymously).not.toHaveBeenCalled();
  });

  it('should NOT sign in if NOT in signature mode', () => {
    Object.defineProperty(window, 'location', {
      value: new URL('http://localhost/'),
      writable: true,
      configurable: true,
    });
    renderHook(() => useSignatureMode('2024-12-28', null, false));

    expect(signInAnonymously).not.toHaveBeenCalled();
  });
});
