import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockWarn = vi.fn();
const mockPrepareClientBootstrap = vi.fn();

vi.mock('@/services/utils/loggerService', () => ({
  logger: {
    child: () => ({
      warn: (...args: unknown[]) => mockWarn(...args),
    }),
  },
}));

vi.mock('@/services/config/clientBootstrapRecovery', () => ({
  prepareClientBootstrap: (...args: unknown[]) => mockPrepareClientBootstrap(...args),
}));

import { useVersionCheck } from '@/hooks/useVersionCheck';

describe('useVersionCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockPrepareClientBootstrap.mockResolvedValue(true);
  });

  it('runs bootstrap reconciliation once after mount', async () => {
    renderHook(() => useVersionCheck());

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(mockPrepareClientBootstrap).toHaveBeenCalledTimes(1);
    expect(mockWarn).not.toHaveBeenCalled();
  });
});
