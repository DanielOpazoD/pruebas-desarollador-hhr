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
});
