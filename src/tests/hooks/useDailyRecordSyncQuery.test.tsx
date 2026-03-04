import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useDailyRecordSyncQuery } from '@/hooks/useDailyRecordSyncQuery';
import * as DailyRecordRepository from '@/services/repositories/DailyRecordRepository';
import { createQueryClientTestWrapper } from '@/tests/utils/queryClientTestUtils';
import type { DailyRecord } from '@/types';
import { DataFactory } from '@/tests/factories/DataFactory';

// Mock Repository
vi.mock('@/services/repositories/DailyRecordRepository', () => {
  const mockImpl = {
    getForDate: vi.fn(),
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
  };
  return {
    ...mockImpl,
    DailyRecordRepository: mockImpl,
  };
});

import { UIProvider } from '@/context/UIContext';

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

  it('should fetch the record on mount', async () => {
    vi.mocked(DailyRecordRepository.getForDate).mockResolvedValue(mockRecord);

    const { result } = renderHook(() => useDailyRecordSyncQuery(mockDate), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.record).toEqual(mockRecord);
    });

    expect(DailyRecordRepository.getForDate).toHaveBeenCalledWith(mockDate);
  });

  it('should handle updates via saveAndUpdate', async () => {
    vi.mocked(DailyRecordRepository.getForDate).mockResolvedValue(mockRecord);

    const { result } = renderHook(() => useDailyRecordSyncQuery(mockDate), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.record).not.toBeNull());

    const updatedRecord = { ...mockRecord, lastUpdated: 'new-date' };
    await result.current.saveAndUpdate(updatedRecord);

    expect(DailyRecordRepository.saveDetailed).toHaveBeenCalledWith(updatedRecord);
  });

  it('refreshes through detailed sync before refetching', async () => {
    vi.mocked(DailyRecordRepository.getForDate).mockResolvedValue(mockRecord);

    const { result } = renderHook(() => useDailyRecordSyncQuery(mockDate), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.record).not.toBeNull());

    result.current.refresh();

    await waitFor(() => {
      expect(DailyRecordRepository.syncWithFirestoreDetailed).toHaveBeenCalledWith(mockDate);
    });
  });
});
