import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hospitalDB } from '@/services/storage/indexedDBService';
import {
  getSyncQueueTelemetry,
  processSyncQueue,
  queueSyncTask,
} from '@/services/storage/syncQueueService';
import { DailyRecord } from '@/types';

vi.mock('@/services/infrastructure/db', () => ({
  db: {
    setDoc: vi.fn().mockResolvedValue(undefined),
  },
}));

import { db } from '@/services/infrastructure/db';

const makeRecord = (date: string, marker: string): DailyRecord =>
  ({
    date,
    beds: {},
    discharges: [],
    transfers: [],
    cma: [],
    lastUpdated: marker,
    nurses: [],
    activeExtraBeds: [],
  }) as DailyRecord;

describe('syncQueueService load baseline', () => {
  beforeEach(async () => {
    await hospitalDB.syncQueue.clear();
    vi.clearAllMocks();
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
  });

  it('handles volume of 120 queued records and flushes all', async () => {
    const total = 120;
    for (let i = 0; i < total; i++) {
      const date = `2026-03-${String((i % 28) + 1).padStart(2, '0')}-${i}`;
      await queueSyncTask('UPDATE_DAILY_RECORD', makeRecord(date, `v${i}`));
    }

    const t0 = Date.now();
    await processSyncQueue();
    const elapsedMs = Date.now() - t0;

    const telemetry = await getSyncQueueTelemetry();
    expect(telemetry.pending).toBe(0);
    expect(telemetry.failed).toBe(0);
    expect(telemetry.conflict).toBe(0);
    expect(vi.mocked(db.setDoc)).toHaveBeenCalledTimes(total);
    expect(elapsedMs).toBeLessThan(8000);
  });

  it('supports retry burst and eventual drain after nextAttemptAt is reached', async () => {
    const total = 40;
    let callCount = 0;
    vi.mocked(db.setDoc).mockImplementation(async () => {
      callCount += 1;
      if (callCount <= 10) {
        throw new Error('Network temporary failure');
      }
    });

    for (let i = 0; i < total; i++) {
      const date = `2026-04-${String((i % 28) + 1).padStart(2, '0')}-${i}`;
      await queueSyncTask('UPDATE_DAILY_RECORD', makeRecord(date, `r${i}`));
    }

    await processSyncQueue();
    let telemetry = await getSyncQueueTelemetry();
    expect(telemetry.pending).toBeGreaterThan(0);
    expect(telemetry.retrying).toBeGreaterThan(0);

    await hospitalDB.syncQueue
      .where('status')
      .equals('PENDING')
      .modify(task => {
        task.nextAttemptAt = 0;
      });

    await processSyncQueue();
    telemetry = await getSyncQueueTelemetry();
    expect(telemetry.pending).toBe(0);
    expect(telemetry.failed).toBe(0);
    expect(telemetry.conflict).toBe(0);
  });
});
