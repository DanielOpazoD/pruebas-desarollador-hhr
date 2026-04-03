import { describe, expect, it } from 'vitest';
import type { DailyRecord } from '@/types/domain/dailyRecord';
import {
  buildArchiveStatusState,
  mergeMonthlyRecordsForBackup,
  resolveHandoffBackupStaff,
  shouldCheckArchiveStatus,
} from '@/hooks/controllers/exportManagerController';

const buildRecord = (date: string): DailyRecord =>
  ({
    date,
    nursesDayShift: ['Dia'],
    nursesNightShift: ['Noche'],
    handoffNightReceives: ['Recibe'],
  }) as DailyRecord;

describe('exportManagerController', () => {
  it('resolves whether archive status should be checked', () => {
    expect(shouldCheckArchiveStatus('2026-03-03', 'CENSUS')).toBe(true);
    expect(shouldCheckArchiveStatus('2026-03-03', 'NURSING_HANDOFF')).toBe(true);
    expect(shouldCheckArchiveStatus('', 'CENSUS')).toBe(false);
  });

  it('merges current record into filtered month records', () => {
    const result = mergeMonthlyRecordsForBackup(
      [buildRecord('2026-03-01'), buildRecord('2026-03-02')],
      buildRecord('2026-03-03'),
      '2026-03-03',
      '2026-03-03'
    );

    expect(result.map(record => record.date)).toEqual(['2026-03-01', '2026-03-02', '2026-03-03']);
  });

  it('resolves handoff backup staff and archive status', () => {
    expect(resolveHandoffBackupStaff(buildRecord('2026-03-03'), 'night')).toEqual({
      delivers: ['Noche'],
      receives: ['Recibe'],
    });
    expect(buildArchiveStatusState({ exists: true, status: 'available' })).toBe(true);
  });
});
