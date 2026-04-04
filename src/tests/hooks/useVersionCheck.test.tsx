import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWarn = vi.fn();
const mockReconcileBootstrapRuntime = vi.fn();

vi.mock('@/services/utils/loggerService', () => ({
  logger: {
    child: () => ({
      warn: (...args: unknown[]) => mockWarn(...args),
    }),
  },
}));

vi.mock('@/app-shell/bootstrap/bootstrapAppRuntime', () => ({
  reconcileBootstrapRuntime: (...args: unknown[]) => mockReconcileBootstrapRuntime(...args),
}));

import { useVersionCheck } from '@/hooks/useVersionCheck';

describe('useVersionCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockReconcileBootstrapRuntime.mockResolvedValue({ status: 'continue', reason: null });
  });

  it('runs bootstrap reconciliation once after mount', async () => {
    renderHook(() => useVersionCheck());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mockReconcileBootstrapRuntime).toHaveBeenCalledTimes(1);
    expect(mockWarn).not.toHaveBeenCalled();
  });

  it('re-checks on an interval during long-lived sessions', async () => {
    renderHook(() => useVersionCheck());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
      await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    });

    expect(mockReconcileBootstrapRuntime).toHaveBeenCalledTimes(2);
  });

  it('re-checks when the window regains focus', async () => {
    renderHook(() => useVersionCheck());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    await act(async () => {
      window.dispatchEvent(new Event('focus'));
    });

    expect(mockReconcileBootstrapRuntime).toHaveBeenCalledTimes(2);
  });
});
