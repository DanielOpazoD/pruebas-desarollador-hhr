import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCensusMigrationBootstrap } from '@/features/census/hooks/useCensusMigrationBootstrap';

const {
  mockedCreateCensusMigrationStorageRuntime,
  mockedExecuteCensusMigrationBootstrapController,
  warnMock,
} = vi.hoisted(() => ({
  mockedCreateCensusMigrationStorageRuntime: vi.fn(),
  mockedExecuteCensusMigrationBootstrapController: vi.fn(),
  warnMock: vi.fn(),
}));

vi.mock('@/features/census/controllers/censusMigrationBootstrapController', () => ({
  createCensusMigrationStorageRuntime: () => mockedCreateCensusMigrationStorageRuntime(),
  executeCensusMigrationBootstrapController: (...args: unknown[]) =>
    mockedExecuteCensusMigrationBootstrapController(...args),
}));

vi.mock('@/services/utils/loggerService', () => ({
  logger: {
    child: () => ({
      warn: warnMock,
    }),
  },
}));

describe('useCensusMigrationBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((callback: IdleRequestCallback) => {
        callback({ didTimeout: false, timeRemaining: () => 0 } as IdleDeadline);
        return 1;
      })
    );
    vi.stubGlobal('cancelIdleCallback', vi.fn());
  });

  it('runs migration bootstrap on mount', () => {
    const runtime = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
    mockedCreateCensusMigrationStorageRuntime.mockReturnValue(runtime);
    mockedExecuteCensusMigrationBootstrapController.mockReturnValue({ ok: true });

    renderHook(() => useCensusMigrationBootstrap());

    expect(mockedExecuteCensusMigrationBootstrapController).toHaveBeenCalledWith(runtime);
  });

  it('logs warning when bootstrap fails', () => {
    const runtime = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
    mockedCreateCensusMigrationStorageRuntime.mockReturnValue(runtime);
    mockedExecuteCensusMigrationBootstrapController.mockReturnValue({
      ok: false,
      error: { message: 'migration failed' },
    });

    renderHook(() => useCensusMigrationBootstrap());

    expect(warnMock).toHaveBeenCalledWith('Migration bootstrap failed', 'migration failed');
  });

  it('does not run when disabled', () => {
    const runtime = { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
    mockedCreateCensusMigrationStorageRuntime.mockReturnValue(runtime);

    renderHook(() => useCensusMigrationBootstrap(false));

    expect(mockedExecuteCensusMigrationBootstrapController).not.toHaveBeenCalled();
  });
});
