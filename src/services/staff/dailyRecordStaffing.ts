import type { DailyRecord } from '@/types';

const normalizeStaffList = (staff?: string[] | null): string[] =>
  Array.isArray(staff) ? staff.map(value => value?.trim() || '').filter(Boolean) : [];

const resolveLegacyDayShiftNurses = (record: DailyRecord): string[] => {
  const legacy = normalizeStaffList(record.nurses);
  if (legacy.length > 0) {
    return legacy;
  }

  return record.nurseName?.trim() ? [record.nurseName.trim()] : [];
};

export const resolveDayShiftNurses = (record: DailyRecord | null | undefined): string[] => {
  if (!record) return [];
  const canonical = normalizeStaffList(record.nursesDayShift);
  return canonical.length > 0 ? canonical : resolveLegacyDayShiftNurses(record);
};

export const resolveNightShiftNurses = (record: DailyRecord | null | undefined): string[] => {
  if (!record) return [];
  return normalizeStaffList(record.nursesNightShift);
};

export const resolvePrimaryDayShiftNurse = (
  record: DailyRecord | null | undefined
): string | undefined => resolveDayShiftNurses(record)[0];

export const resolveShiftNurseSignature = (
  record: DailyRecord | null | undefined,
  preferredShift: 'day' | 'night' = 'night'
): string => {
  if (!record) return '';
  const preferred =
    preferredShift === 'night' ? resolveNightShiftNurses(record) : resolveDayShiftNurses(record);
  if (preferred.length > 0) {
    return preferred.join(' / ');
  }

  const fallback =
    preferredShift === 'night' ? resolveDayShiftNurses(record) : resolveNightShiftNurses(record);
  return fallback.join(' / ');
};

export const resolveExportableNursesText = (
  record: DailyRecord | null | undefined,
  separator = ' & '
): string => resolveDayShiftNurses(record).join(separator);
