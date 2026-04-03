import { describe, expect, it } from 'vitest';

import type { DailyRecord } from '@/types/domain/dailyRecord';
import { resolveDailyRecordPersistenceGoldenPath } from '@/services/repositories/dailyRecordPersistenceGoldenPath';

const buildRecord = (date: string, lastUpdated: string): DailyRecord =>
  ({
    date,
    beds: {},
    discharges: [],
    transfers: [],
    cma: [],
    lastUpdated,
    nurses: [],
    activeExtraBeds: [],
  }) as DailyRecord;

describe('dailyRecordPersistenceGoldenPath', () => {
  it('keeps the local record when it is newer than remote', () => {
    const local = buildRecord('2026-03-18', '2026-03-18T12:00:00.000Z');
    const remote = buildRecord('2026-03-18', '2026-03-18T08:00:00.000Z');

    const result = resolveDailyRecordPersistenceGoldenPath({
      localRecord: local,
      remoteRecord: remote,
      remoteAvailability: 'resolved',
    });

    expect(result.selectedRecord).toBe(local);
    expect(result.selectedStore).toBe('local');
    expect(result.shouldHydrateLocal).toBe(false);
    expect(result.consistencyState).toBe('local_authoritative');
    expect(result.recoveryAction).toBe('defer_remote_sync');
  });

  it('promotes the remote record and hydrates local cache when remote is newer', () => {
    const local = buildRecord('2026-03-18', '2026-03-18T08:00:00.000Z');
    const remote = buildRecord('2026-03-18', '2026-03-18T12:00:00.000Z');

    const result = resolveDailyRecordPersistenceGoldenPath({
      localRecord: local,
      remoteRecord: remote,
      remoteAvailability: 'resolved',
    });

    expect(result.selectedRecord).toBe(remote);
    expect(result.selectedStore).toBe('remote');
    expect(result.shouldHydrateLocal).toBe(true);
    expect(result.consistencyState).toBe('remote_authoritative');
  });

  it('keeps the local record as recoverable fallback when remote is unavailable', () => {
    const local = buildRecord('2026-03-18', '2026-03-18T08:00:00.000Z');

    const result = resolveDailyRecordPersistenceGoldenPath({
      localRecord: local,
      remoteRecord: null,
      remoteAvailability: 'unavailable',
    });

    expect(result.selectedRecord).toBe(local);
    expect(result.selectedStore).toBe('local');
    expect(result.consistencyState).toBe('local_authoritative');
    expect(result.retryability).toBe('automatic_retry');
  });
});
