import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDailyRecordSyncQuery } from '@/hooks/useDailyRecordSyncQuery';
import { defaultDailyRecordRepositoryPort } from '@/application/ports/dailyRecordPort';
import { createSyncDailyRecordResult } from '@/services/repositories/contracts/dailyRecordResults';
import { createQueryClientTestWrapper } from '@/tests/utils/queryClientTestUtils';
import type { DailyRecord } from '@/types/domain/dailyRecord';
import { DataFactory } from '@/tests/factories/DataFactory';

const { mockDailyRecordRepositoryPort } = vi.hoisted(() => ({
  mockDailyRecordRepositoryPort: {
    getForDate: vi.fn(),
    getForDateWithMeta: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    saveDetailed: vi.fn().mockResolvedValue({
      date: '2025-12-27',
      outcome: 'clean',
      savedLocally: true,
      savedRemotely: true,
      queuedForRetry: false,
      autoMerged: false,
    }),
    subscribe: vi.fn(() => vi.fn()),
    subscribeDetailed: vi.fn(() => vi.fn()),
    updatePartial: vi.fn().mockResolvedValue(undefined),
    updatePartialDetailed: vi.fn().mockResolvedValue({
      date: '2025-12-27',
      outcome: 'clean',
      savedLocally: true,
      updatedRemotely: true,
      queuedForRetry: false,
      autoMerged: false,
      patchedFields: 1,
    }),
    syncWithFirestoreDetailed: vi.fn().mockResolvedValue({
      date: '2025-12-27',
      outcome: 'clean',
      record: null,
    }),
    initializeDay: vi.fn(),
    deleteDay: vi.fn(),
    getPreviousDay: vi.fn(),
    getPreviousDayWithMeta: vi.fn(),
    getAvailableDates: vi.fn(),
    getMonthRecords: vi.fn(),
    copyPatientToDateDetailed: vi.fn(),
  },
}));

vi.mock('@/utils/dateUtils', async () => {
  const actual = await vi.importActual('@/utils/dateUtils');
  return {
    ...actual,
    getTodayISO: () => '2025-12-27',
  };
});

vi.mock('@/application/ports/dailyRecordPort', () => ({
  defaultDailyRecordReadPort: mockDailyRecordRepositoryPort,
  defaultDailyRecordWritePort: {
    updatePartial: mockDailyRecordRepositoryPort.updatePartialDetailed,
    save: mockDailyRecordRepositoryPort.saveDetailed,
    delete: mockDailyRecordRepositoryPort.deleteDay,
  },
  defaultDailyRecordSyncPort: {
    syncWithFirestoreDetailed: mockDailyRecordRepositoryPort.syncWithFirestoreDetailed,
  },
  defaultDailyRecordRepositoryPort: mockDailyRecordRepositoryPort,
}));

import { UIProvider } from '@/context/UIContext';

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const createWrapper = () => {
  const { wrapper } = createQueryClientTestWrapper({
    wrapChildren: children => <UIProvider>{children}</UIProvider>,
  });
  return wrapper;
};

describe('useDailyRecordSyncQuery', () => {
  const mockDate = '2025-12-27';
  const mockRecord: DailyRecord = DataFactory.createMockDailyRecord(mockDate, {
    beds: {},
    lastUpdated: '2026-01-01T00:00:00.000Z',
    discharges: [],
    transfers: [],
    cma: [],
    nurses: [],
    activeExtraBeds: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const buildReadResult = (record: DailyRecord | null) => ({
    date: mockDate,
    record,
    source: record ? ('indexeddb' as const) : ('not_found' as const),
    compatibilityTier: 'none' as const,
    compatibilityIntensity: 'none' as const,
    migrationRulesApplied: [],
    consistencyState: record ? ('local_only' as const) : ('missing' as const),
    sourceOfTruth: record ? ('local' as const) : ('none' as const),
    retryability: 'not_applicable' as const,
    recoveryAction: 'none' as const,
    conflictSummary: null,
    observabilityTags: ['daily_record', 'read'],
    repairApplied: false,
  });

  const buildUnavailableReadResult = () => ({
    date: mockDate,
    record: null,
    source: 'not_found' as const,
    compatibilityTier: 'none' as const,
    compatibilityIntensity: 'none' as const,
    migrationRulesApplied: [],
    consistencyState: 'unavailable' as const,
    sourceOfTruth: 'none' as const,
    retryability: 'automatic_retry' as const,
    recoveryAction: 'defer_remote_sync' as const,
    conflictSummary: null,
    observabilityTags: ['daily_record', 'read', 'remote_unavailable'],
    userSafeMessage: 'No se pudo consultar el registro remoto.',
    repairApplied: false,
  });

  it('should fetch the record on mount', async () => {
    vi.mocked(defaultDailyRecordRepositoryPort.getForDateWithMeta).mockResolvedValue(
      buildReadResult(mockRecord)
    );

    const { result } = renderHook(() => useDailyRecordSyncQuery(mockDate, false, 'ready'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.record).toEqual(mockRecord);
    });

    expect(defaultDailyRecordRepositoryPort.getForDateWithMeta).toHaveBeenCalledWith(
      mockDate,
      true
    );
  });

  it('should handle updates via saveAndUpdate', async () => {
    vi.mocked(defaultDailyRecordRepositoryPort.getForDateWithMeta).mockResolvedValue(
      buildReadResult(mockRecord)
    );

    const { result } = renderHook(() => useDailyRecordSyncQuery(mockDate, false, 'ready'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.record).not.toBeNull());

    const updatedRecord = { ...mockRecord, lastUpdated: 'new-date' };
    await result.current.saveAndUpdate(updatedRecord);

    expect(defaultDailyRecordRepositoryPort.saveDetailed).toHaveBeenCalledWith(updatedRecord);
  });

  it('refreshes through detailed sync before refetching', async () => {
    vi.mocked(defaultDailyRecordRepositoryPort.getForDateWithMeta).mockResolvedValue(
      buildReadResult(mockRecord)
    );

    const { result } = renderHook(() => useDailyRecordSyncQuery(mockDate, false, 'ready'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.record).not.toBeNull());

    result.current.refresh();

    await waitFor(() => {
      expect(defaultDailyRecordRepositoryPort.syncWithFirestoreDetailed).toHaveBeenCalledWith(
        mockDate
      );
    });
  });

  it('keeps the newest refresh result when an older sync resolves later', async () => {
    vi.mocked(defaultDailyRecordRepositoryPort.getForDateWithMeta).mockResolvedValue(
      buildReadResult(mockRecord)
    );

    const firstRefresh = createDeferred<ReturnType<typeof createSyncDailyRecordResult>>();
    const secondRefresh = createDeferred<ReturnType<typeof createSyncDailyRecordResult>>();

    vi.mocked(defaultDailyRecordRepositoryPort.syncWithFirestoreDetailed)
      .mockImplementationOnce(() => firstRefresh.promise)
      .mockImplementationOnce(() => secondRefresh.promise);

    const { result } = renderHook(() => useDailyRecordSyncQuery(mockDate, false, 'ready'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.record).not.toBeNull());
    vi.mocked(defaultDailyRecordRepositoryPort.syncWithFirestoreDetailed).mockClear();
    vi.mocked(defaultDailyRecordRepositoryPort.getForDateWithMeta).mockClear();

    result.current.refresh();
    result.current.refresh();

    await waitFor(() => {
      expect(defaultDailyRecordRepositoryPort.syncWithFirestoreDetailed).toHaveBeenCalledTimes(2);
    });

    secondRefresh.resolve(
      createSyncDailyRecordResult({
        date: mockDate,
        outcome: 'clean',
        record: mockRecord,
      })
    );

    await waitFor(() => {
      expect(defaultDailyRecordRepositoryPort.getForDateWithMeta).toHaveBeenCalledTimes(1);
    });

    firstRefresh.resolve(
      createSyncDailyRecordResult({
        date: mockDate,
        outcome: 'clean',
        record: mockRecord,
      })
    );

    await waitFor(() => {
      expect(defaultDailyRecordRepositoryPort.getForDateWithMeta).toHaveBeenCalledTimes(1);
    });
  });

  it('forces a recovery sync once when today loads as empty', async () => {
    vi.mocked(defaultDailyRecordRepositoryPort.getForDateWithMeta).mockResolvedValue(
      buildReadResult(null)
    );

    renderHook(() => useDailyRecordSyncQuery(mockDate, false, 'ready'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(defaultDailyRecordRepositoryPort.syncWithFirestoreDetailed).toHaveBeenCalledWith(
        mockDate
      );
    });
  });

  it('retries remote hydration when the runtime becomes ready after an initial local-empty read', async () => {
    vi.mocked(defaultDailyRecordRepositoryPort.getForDateWithMeta).mockImplementation(
      async (_date, syncFromRemote) => buildReadResult(syncFromRemote ? mockRecord : null)
    );

    const { result, rerender } = renderHook(
      ({ remoteSyncStatus }: { remoteSyncStatus: 'local_only' | 'ready' }) =>
        useDailyRecordSyncQuery(mockDate, false, remoteSyncStatus),
      {
        initialProps: { remoteSyncStatus: 'local_only' } as {
          remoteSyncStatus: 'local_only' | 'ready';
        },
        wrapper: createWrapper(),
      }
    );

    await waitFor(() => {
      expect(defaultDailyRecordRepositoryPort.getForDateWithMeta).toHaveBeenCalledWith(
        mockDate,
        false
      );
    });
    expect(result.current.record).toBeNull();

    rerender({ remoteSyncStatus: 'ready' });

    await waitFor(() => {
      expect(defaultDailyRecordRepositoryPort.getForDateWithMeta).toHaveBeenCalledWith(
        mockDate,
        true
      );
      expect(result.current.record).toEqual(mockRecord);
    });
  });

  it('retries automatically after an initial temporarily unavailable remote read', async () => {
    vi.mocked(defaultDailyRecordRepositoryPort.getForDateWithMeta)
      .mockResolvedValueOnce(buildUnavailableReadResult())
      .mockResolvedValueOnce(buildReadResult(mockRecord));

    const { result } = renderHook(() => useDailyRecordSyncQuery(mockDate, false, 'ready'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(defaultDailyRecordRepositoryPort.getForDateWithMeta).toHaveBeenCalledWith(
        mockDate,
        true
      );
    });

    await waitFor(
      () => {
        expect(defaultDailyRecordRepositoryPort.getForDateWithMeta).toHaveBeenCalledTimes(2);
        expect(result.current.record).toEqual(mockRecord);
      },
      { timeout: 2_500 }
    );
  }, 4_000);
});
