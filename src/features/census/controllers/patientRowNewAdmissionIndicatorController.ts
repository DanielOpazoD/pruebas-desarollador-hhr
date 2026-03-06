import { getShiftSchedule } from '@/utils/dateUtils';

interface ResolveIsNewAdmissionForRecordParams {
  recordDate: string;
  admissionDate?: string;
  admissionTime?: string;
}

const normalizeDateOnly = (value?: string): string | null => {
  if (!value) return null;
  const normalized = value.split('T')[0]?.trim();
  if (!normalized) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
};

const parseTimeMinutes = (value?: string): number | null => {
  if (!value) return null;
  const [hourPart = '', minutePart = ''] = value.trim().split(':');
  const hour = Number.parseInt(hourPart, 10);
  const minute = Number.parseInt(minutePart, 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return hour * 60 + minute;
};

const getNextDay = (recordDate: string): string | null => {
  const normalized = normalizeDateOnly(recordDate);
  if (!normalized) return null;
  const value = new Date(`${normalized}T12:00:00`);
  if (Number.isNaN(value.getTime())) return null;
  value.setDate(value.getDate() + 1);
  return value.toISOString().split('T')[0];
};

export const resolveIsNewAdmissionForRecord = ({
  recordDate,
  admissionDate,
  admissionTime,
}: ResolveIsNewAdmissionForRecordParams): boolean => {
  const normalizedRecordDate = normalizeDateOnly(recordDate);
  const normalizedAdmissionDate = normalizeDateOnly(admissionDate);
  if (!normalizedRecordDate || !normalizedAdmissionDate) {
    return false;
  }

  if (normalizedAdmissionDate === normalizedRecordDate) {
    return true;
  }

  const nextDay = getNextDay(normalizedRecordDate);
  if (!nextDay || normalizedAdmissionDate !== nextDay) {
    return false;
  }

  const admissionMinutes = parseTimeMinutes(admissionTime);
  if (admissionMinutes === null) {
    return true;
  }

  const nightEndMinutes =
    parseTimeMinutes(getShiftSchedule(normalizedRecordDate).nightEnd) ?? 8 * 60;
  return admissionMinutes < nightEndMinutes;
};
