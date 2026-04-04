import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTransferSubscriptions } from '@/features/transfers/hooks/useTransferSubscriptions';
import { useAuth } from '@/context/AuthContext';
import { setFirestoreSyncState } from '@/services/repositories/repositoryConfig';

const subscribeToTransfersMock = vi.fn();

vi.mock('@/services/transfers/transferService', () => ({
  subscribeToTransfers: (...args: unknown[]) => subscribeToTransfersMock(...args),
}));

vi.mock('@/context/AuthContext', async importOriginal => {
  const actual = await importOriginal<typeof import('@/context/AuthContext')>();
  return {
    ...actual,
    useAuth: vi.fn(),
  };
});

describe('useTransferSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setFirestoreSyncState({
      mode: 'enabled',
      reason: 'ready',
    });
    vi.mocked(useAuth).mockReturnValue({
      remoteSyncStatus: 'ready',
    } as ReturnType<typeof useAuth>);
  });

  it('loads transfers from subscription callback', async () => {
    subscribeToTransfersMock.mockImplementation((onData: (value: unknown[]) => void) => {
      onData([{ id: 'TR-1' }]);
      return vi.fn();
    });

    const { result } = renderHook(() => useTransferSubscriptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.transfers).toEqual([{ id: 'TR-1' }]);
    expect(result.current.error).toBeNull();
  });

  it('surfaces subscription error messages', async () => {
    subscribeToTransfersMock.mockImplementation(
      (_onData: (value: unknown[]) => void, options?: { onError?: (message: string) => void }) => {
        options?.onError?.('sync failed');
        return vi.fn();
      }
    );

    const { result } = renderHook(() => useTransferSubscriptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('sync failed');
  });

  it('keeps subscription paused while remote sync runtime is bootstrapping', () => {
    setFirestoreSyncState({
      mode: 'bootstrapping',
      reason: 'auth_loading',
    });
    vi.mocked(useAuth).mockReturnValue({
      remoteSyncStatus: 'bootstrapping',
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useTransferSubscriptions());

    expect(subscribeToTransfersMock).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);
  });

  it('stays local-only without subscribing when remote sync is unavailable', async () => {
    vi.mocked(useAuth).mockReturnValue({
      remoteSyncStatus: 'local_only',
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useTransferSubscriptions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(subscribeToTransfersMock).not.toHaveBeenCalled();
    expect(result.current.transfers).toEqual([]);
  });
});
