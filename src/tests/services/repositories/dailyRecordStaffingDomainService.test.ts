import { describe, expect, it } from 'vitest';
import { DailyRecord } from '@/types';
import { resolveInheritedDailyRecordStaffing } from '@/services/repositories/dailyRecordStaffingDomainService';

const buildRecord = (date: string): DailyRecord =>
  ({
    date,
    beds: {},
    discharges: [],
    transfers: [],
    cma: [],
    lastUpdated: `${date}T08:00:00.000Z`,
    nurses: ['', ''],
    nursesDayShift: ['', ''],
    nursesNightShift: ['', ''],
    tensDayShift: ['', '', ''],
    tensNightShift: ['', '', ''],
    activeExtraBeds: [],
  }) as DailyRecord;

describe('dailyRecordStaffingDomainService', () => {
  it('inherits night staffing into the next day defaults', () => {
    const previous = buildRecord('2026-02-18');
    previous.nursesNightShift = ['N1', 'N2'];
    previous.tensNightShift = ['T1', 'T2', 'T3'];

    const result = resolveInheritedDailyRecordStaffing(previous);

    expect(result.nursesDay).toEqual(['N1', 'N2']);
    expect(result.nursesNight).toEqual(['', '']);
    expect(result.tensDay).toEqual(['T1', 'T2', 'T3']);
    expect(result.tensNight).toEqual(['', '', '']);
  });
});
