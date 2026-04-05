import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.unmock('@/hooks/useAuthState');

import { useAppState } from '@/hooks/useAppState';
import { useAuthState } from '@/hooks/useAuthState';
import { useDateNavigation } from '@/hooks/useDateNavigation';
import { useVersionCheck } from '@/hooks/useVersionCheck';
import type { AuthSessionState, AuthUser } from '@/types/auth';
import * as authService from '@/services/auth/authService';
import * as authUseCases from '@/application/auth';
import * as sessionScopedStorageService from '@/services/storage/sessionScopedStorageService';
import * as bootstrapAppRuntime from '@/app-shell/bootstrap/bootstrapAppRuntime';

vi.mock('@/services/auth/authService', () => ({
  onAuthSessionStateChange: vi.fn(),
  signOut: vi.fn(),
  hasActiveFirebaseSession: vi.fn(),
}));

vi.mock('@/application/auth', () => ({
  executeRedirectAuthResolution: vi.fn(),
  executeResolvedCurrentAuthSessionState: vi.fn(),
}));

vi.mock('@/services/storage/sessionScopedStorageService', () => ({
  clearSessionScopedClientState: vi.fn().mockResolvedValue(undefined),
  reconcileAuthorizedSessionOwner: vi.fn().mockResolvedValue(undefined),
  resolveSessionOwnerKey: (uid: string | null | undefined) => (uid ? `user:${uid}` : null),
}));

vi.mock('@/app-shell/bootstrap/bootstrapAppRuntime', () => ({
  reconcileBootstrapRuntime: vi.fn().mockResolvedValue({ status: 'continue', reason: null }),
}));

const setOnlineStatus = (online: boolean) => {
  Object.defineProperty(window.navigator, 'onLine', {
    configurable: true,
    get: () => online,
  });
};

const useLifecycleHarness = () => {
  const auth = useAuthState();
  const app = useAppState();
  const dateNav = useDateNavigation();
  useVersionCheck();

  return { auth, app, dateNav };
};

const flushBootstrap = async () => {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
};

describe('auth/sync/deploy lifecycle integration', () => {
  let authSessionStateCallback: ((sessionState: AuthSessionState) => void | Promise<void>) | null =
    null;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    authSessionStateCallback = null;
    setOnlineStatus(true);
    window.history.replaceState({}, '', '/?module=MEDICAL_HANDOFF&date=2026-03-14');

    vi.mocked(authService.onAuthSessionStateChange).mockImplementation(
      (cb: (sessionState: AuthSessionState) => void | Promise<void>) => {
        authSessionStateCallback = cb;
        void cb({ status: 'unauthenticated', user: null });
        return () => {};
      }
    );
    vi.mocked(authUseCases.executeRedirectAuthResolution).mockResolvedValue({
      status: 'success',
      data: null,
      issues: [],
    });
    vi.mocked(authUseCases.executeResolvedCurrentAuthSessionState).mockResolvedValue({
      status: 'success',
      data: null,
      issues: [],
    });
    vi.mocked(authService.hasActiveFirebaseSession).mockReturnValue(false);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('covers login, deploy check, refresh recovery, logout and user switch in one flow', async () => {
    const user1: AuthUser = {
      uid: 'user-1',
      email: 'user1@hhr.cl',
      role: 'admin',
      displayName: 'User One',
    };
    const user2: AuthUser = {
      uid: 'user-2',
      email: 'user2@hhr.cl',
      role: 'nurse_hospital',
      displayName: 'User Two',
    };

    const firstRender = renderHook(() => useLifecycleHarness());
    await flushBootstrap();
    expect(firstRender.result.current.auth.authLoading).toBe(false);

    expect(firstRender.result.current.app.currentModule).toBe('MEDICAL_HANDOFF');
    expect(firstRender.result.current.dateNav.currentDateString).toBe('2026-03-14');

    await act(async () => {
      await authSessionStateCallback?.({
        status: 'authorized',
        user: user1,
      });
    });
    await flushBootstrap();
    expect(sessionScopedStorageService.reconcileAuthorizedSessionOwner).toHaveBeenCalledWith(
      'user:user-1'
    );

    await act(async () => {
      firstRender.result.current.app.setCurrentModule('CUDYR');
      firstRender.result.current.dateNav.setSelectedDay(20);
    });

    expect(new URLSearchParams(window.location.search).get('module')).toBe('CUDYR');
    expect(new URLSearchParams(window.location.search).get('date')).toBe('2026-03-20');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      window.dispatchEvent(new Event('focus'));
    });

    expect(bootstrapAppRuntime.reconcileBootstrapRuntime).toHaveBeenCalledTimes(2);

    firstRender.unmount();

    const secondRender = renderHook(() => useLifecycleHarness());
    await flushBootstrap();
    expect(secondRender.result.current.auth.authLoading).toBe(false);

    expect(secondRender.result.current.app.currentModule).toBe('CUDYR');
    expect(secondRender.result.current.dateNav.currentDateString).toBe('2026-03-20');

    await act(async () => {
      await authSessionStateCallback?.({
        status: 'authorized',
        user: user1,
      });
    });

    await act(async () => {
      await secondRender.result.current.auth.handleLogout('manual');
    });

    expect(sessionScopedStorageService.clearSessionScopedClientState).toHaveBeenCalledWith(
      'manual'
    );
    expect(secondRender.result.current.auth.user).toBe(null);

    await act(async () => {
      await authSessionStateCallback?.({
        status: 'authorized',
        user: user2,
      });
    });
    await flushBootstrap();
    expect(sessionScopedStorageService.reconcileAuthorizedSessionOwner).toHaveBeenCalledWith(
      'user:user-2'
    );
    expect(secondRender.result.current.auth.user?.uid).toBe('user-2');
  });
});
