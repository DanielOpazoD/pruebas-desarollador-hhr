import type { DailyRecord } from '@/types';
import { createDailyRecordAggregate } from '@/services/repositories/dailyRecordAggregate';

export interface InheritedDailyRecordStaffing {
  nursesDay: string[];
  nursesNight: string[];
  tensDay: string[];
  tensNight: string[];
}

export const resolveInheritedDailyRecordStaffing = (
  prevRecord: DailyRecord | null
): InheritedDailyRecordStaffing => {
  if (!prevRecord) {
    return {
      nursesDay: ['', ''],
      nursesNight: ['', ''],
      tensDay: ['', '', ''],
      tensNight: ['', '', ''],
    };
  }

  const aggregate = createDailyRecordAggregate(prevRecord);
  const isNightShiftEmpty = aggregate.staffing.nursesNight.every(n => !n);
  const prevNurses = !isNightShiftEmpty
    ? aggregate.staffing.nursesNight
    : aggregate.staffing.nursesLegacy.length > 0
      ? aggregate.staffing.nursesLegacy
      : ['', ''];
  const nursesDay = [...(prevNurses || ['', ''])];
  while (nursesDay.length < 2) nursesDay.push('');

  const isNightTensEmpty = aggregate.staffing.tensNight.every(t => !t);
  const rawTens = !isNightTensEmpty ? aggregate.staffing.tensNight : aggregate.staffing.tensDay;
  const tensDay = [...rawTens];
  while (tensDay.length < 3) tensDay.push('');

  return {
    nursesDay: nursesDay.slice(0, 2),
    nursesNight: ['', ''],
    tensDay: tensDay.slice(0, 3),
    tensNight: ['', '', ''],
  };
};
