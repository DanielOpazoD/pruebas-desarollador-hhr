import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStorageMigration } from '@/hooks/useStorageMigration';
import * as storageCore from '@/services/storage/core';
import { restoreConsole, suppressConsole } from '@/tests/utils/consoleTestUtils';

vi.mock('@/services/storage/core', () => ({
  migrateFromLocalStorage: vi.fn(),
  isIndexedDBAvailable: vi.fn(),
}));

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

describe('useStorageMigration', () => {
  let consoleSpies: Array<{ mockRestore: () => void }> = [];

  beforeEach(() => {
    vi.clearAllMocks();
    consoleSpies = suppressConsole(['warn', 'error']);
  });

  afterEach(() => {
    restoreConsole(consoleSpies);
  });

  it('should complete startup migration when enabled', async () => {
    vi.mocked(storageCore.isIndexedDBAvailable).mockReturnValue(true);
    vi.mocked(storageCore.migrateFromLocalStorage).mockResolvedValue(false);

    const { result } = renderHook(() => useStorageMigration());

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
    });

    expect(result.current.isMigrating).toBe(false);
  });

  it('should stay idle when disabled', async () => {
    vi.mocked(storageCore.isIndexedDBAvailable).mockReturnValue(true);

    const { result } = renderHook(() => useStorageMigration({ enabled: false }));

    expect(result.current.isComplete).toBe(true);
    expect(result.current.isMigrating).toBe(false);
    expect(result.current.didMigrate).toBe(false);
    expect(storageCore.migrateFromLocalStorage).not.toHaveBeenCalled();
  });

  it('should complete migration successfully when IndexedDB is available', async () => {
    vi.mocked(storageCore.isIndexedDBAvailable).mockReturnValue(true);
    vi.mocked(storageCore.migrateFromLocalStorage).mockResolvedValue(true);

    const { result } = renderHook(() => useStorageMigration());

    await waitFor(() => {
      expect(result.current.didMigrate).toBe(true);
    });

    expect(result.current.isMigrating).toBe(false);
    expect(result.current.didMigrate).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('should skip migration when IndexedDB is not available', async () => {
    vi.mocked(storageCore.isIndexedDBAvailable).mockReturnValue(false);

    const { result } = renderHook(() => useStorageMigration());

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
    });

    expect(result.current.isMigrating).toBe(false);
    expect(result.current.didMigrate).toBe(false);
    expect(storageCore.migrateFromLocalStorage).not.toHaveBeenCalled();
  });

  it('should handle migration errors gracefully', async () => {
    vi.mocked(storageCore.isIndexedDBAvailable).mockReturnValue(true);
    vi.mocked(storageCore.migrateFromLocalStorage).mockRejectedValue(new Error('Migration failed'));

    const { result } = renderHook(() => useStorageMigration());

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
    });

    expect(result.current.isMigrating).toBe(false);
    expect(result.current.didMigrate).toBe(false);
    expect(result.current.error).toBe('Migration failed');
  });

  it('should handle non-Error exceptions', async () => {
    vi.mocked(storageCore.isIndexedDBAvailable).mockReturnValue(true);
    vi.mocked(storageCore.migrateFromLocalStorage).mockRejectedValue('String error');

    const { result } = renderHook(() => useStorageMigration());

    await waitFor(() => {
      expect(result.current.error).toBe('Unknown error');
    });

    expect(result.current.error).toBe('Unknown error');
  });

  it('keeps the newest migration result when an older run resolves later', async () => {
    vi.mocked(storageCore.isIndexedDBAvailable).mockReturnValue(true);

    const firstMigration = createDeferred<boolean>();
    const secondMigration = createDeferred<boolean>();

    vi.mocked(storageCore.migrateFromLocalStorage)
      .mockImplementationOnce(() => firstMigration.promise)
      .mockImplementationOnce(() => secondMigration.promise);

    const { result, rerender } = renderHook(
      ({ enabled }: { enabled: boolean }) => useStorageMigration({ enabled }),
      {
        initialProps: { enabled: true },
      }
    );

    await waitFor(() => {
      expect(result.current.isMigrating).toBe(true);
    });

    rerender({ enabled: false });
    rerender({ enabled: true });

    await waitFor(() => {
      expect(storageCore.migrateFromLocalStorage).toHaveBeenCalledTimes(2);
    });

    secondMigration.resolve(false);

    await waitFor(() => {
      expect(result.current.isComplete).toBe(true);
      expect(result.current.isMigrating).toBe(false);
      expect(result.current.didMigrate).toBe(false);
    });

    firstMigration.resolve(true);

    await waitFor(() => {
      expect(result.current.didMigrate).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });
});
