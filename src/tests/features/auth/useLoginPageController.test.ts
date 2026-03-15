import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AUTH_UI_COPY } from '@/services/auth/authUiCopy';
import {
  createApplicationFailed,
  createApplicationSuccess,
} from '@/application/shared/applicationOutcome';
import type { AuthSessionState } from '@/types';

const mockExecuteGoogleSignIn = vi.fn();
const mockIsPopupRecoverableAuthError = vi.fn();
const mockResolveAuthErrorCode = vi.fn();

vi.mock('@/application/auth', () => ({
  executeGoogleSignIn: (...args: unknown[]) => mockExecuteGoogleSignIn(...args),
}));

vi.mock('@/services/auth/authErrorPolicy', () => ({
  isPopupRecoverableAuthError: (...args: unknown[]) => mockIsPopupRecoverableAuthError(...args),
  resolveAuthErrorCode: (...args: unknown[]) => mockResolveAuthErrorCode(...args),
}));

import { useLoginPageController } from '@/features/auth/components/useLoginPageController';

describe('useLoginPageController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPopupRecoverableAuthError.mockReturnValue(false);
    mockResolveAuthErrorCode.mockReturnValue(null);
    mockExecuteGoogleSignIn.mockResolvedValue(
      createApplicationSuccess<AuthSessionState>({
        status: 'authorized',
        user: {
          uid: 'google-1',
          email: 'test@hospital.cl',
          displayName: 'Google User',
          role: 'admin',
        },
      })
    );
  });

  it('calls onLoginSuccess when Google login succeeds', async () => {
    const onLoginSuccess = vi.fn();
    const { result } = renderHook(() => useLoginPageController(onLoginSuccess));

    await act(async () => {
      await result.current.handleGoogleSignIn();
    });

    expect(mockExecuteGoogleSignIn).toHaveBeenCalledTimes(1);
    expect(onLoginSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
    expect(result.current.isAnyLoading).toBe(false);
  });

  it('keeps the user on the same login screen when the popup has a recoverable issue', async () => {
    mockExecuteGoogleSignIn.mockResolvedValueOnce(
      createApplicationFailed<AuthSessionState>(
        {
          status: 'auth_error',
          user: null,
          error: {
            code: 'auth/popup-blocked',
            message: 'popup blocked',
          },
        },
        [{ kind: 'unknown', code: 'auth/popup-blocked', message: 'popup blocked' }]
      )
    );
    mockIsPopupRecoverableAuthError.mockReturnValueOnce(true);
    mockResolveAuthErrorCode.mockReturnValueOnce('auth/popup-blocked');

    const { result } = renderHook(() => useLoginPageController(vi.fn()));

    await act(async () => {
      await result.current.handleGoogleSignIn();
    });

    expect(result.current.errorCode).toBe('auth/popup-blocked');
    expect(result.current.error).toBe(AUTH_UI_COPY.blockedPopupStayOnPage);
    expect(result.current.isGoogleLoading).toBe(false);
    expect(result.current.isAnyLoading).toBe(false);
  });

  it('surfaces non-recoverable popup errors without switching flows', async () => {
    mockExecuteGoogleSignIn.mockResolvedValueOnce(
      createApplicationFailed<AuthSessionState>(
        {
          status: 'auth_error',
          user: null,
          error: {
            code: 'auth/google-signin-failed',
            message: 'google auth down',
          },
        },
        [{ kind: 'unknown', code: 'auth/google-signin-failed', message: 'google auth down' }]
      )
    );
    mockResolveAuthErrorCode.mockReturnValueOnce('auth/google-signin-failed');

    const { result } = renderHook(() => useLoginPageController(vi.fn()));

    await act(async () => {
      await result.current.handleGoogleSignIn();
    });

    expect(result.current.errorCode).toBe('auth/google-signin-failed');
    expect(result.current.error).toBe('google auth down');
    expect(result.current.isGoogleLoading).toBe(false);
  });
});
