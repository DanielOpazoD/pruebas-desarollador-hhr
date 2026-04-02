import { getNextDay, getTodayISO, normalizeDateOnly } from '@/utils/dateUtils';
import { resolveMovementDateForRecordShift } from './clinicalShiftCalendarController';

export interface AdmissionDateChangeResolution {
  admissionDate: string;
  admissionTime?: string;
  shouldPatchMultiple: boolean;
}

export interface AdmissionDateAuditResolution {
  baseDate: string;
  candidateDates: string[];
  suggestedAdmissionDate: string;
  isSuspicious: boolean;
  message?: string;
}

const formatTimeHHMM = (date: Date): string => {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const resolveAdmissionDateMax = (todayIso: string = getTodayISO()): string => todayIso;

export const resolveIsCriticalAdmissionEmpty = (
  patientName?: string,
  admissionDate?: string
): boolean => Boolean(patientName) && !admissionDate;

export const resolveAdmissionDateChange = ({
  nextDate,
  currentAdmissionTime,
  now = new Date(),
}: {
  nextDate: string;
  currentAdmissionTime?: string;
  now?: Date;
}): AdmissionDateChangeResolution => {
  if (nextDate && !currentAdmissionTime) {
    return {
      admissionDate: nextDate,
      admissionTime: formatTimeHHMM(now),
      shouldPatchMultiple: true,
    };
  }

  return {
    admissionDate: nextDate,
    shouldPatchMultiple: false,
  };
};

export const resolveAdmissionDateAudit = ({
  recordDate,
  admissionDate,
  admissionTime,
  firstSeenDate,
}: {
  recordDate: string;
  admissionDate?: string;
  admissionTime?: string;
  firstSeenDate?: string;
}): AdmissionDateAuditResolution => {
  const baseDate = normalizeDateOnly(firstSeenDate) ?? normalizeDateOnly(recordDate) ?? '';
  if (!baseDate) {
    return {
      baseDate: '',
      candidateDates: [],
      suggestedAdmissionDate: '',
      isSuspicious: false,
    };
  }

  const candidateDates = Array.from(new Set([baseDate, getNextDay(baseDate)]));
  const suggestedAdmissionDate =
    resolveMovementDateForRecordShift(baseDate, undefined, admissionTime) || baseDate;
  const normalizedAdmissionDate = normalizeDateOnly(admissionDate);
  const isSuspicious =
    normalizedAdmissionDate !== undefined && !candidateDates.includes(normalizedAdmissionDate);

  if (!isSuspicious) {
    return {
      baseDate,
      candidateDates,
      suggestedAdmissionDate,
      isSuspicious: false,
    };
  }

  const allowedDatesLabel = candidateDates.join(' / ');
  const message = firstSeenDate
    ? `La fecha no coincide con la primera aparición observada. Revisa ${allowedDatesLabel}.`
    : `La fecha no coincide con la ventana esperada para ingreso nuevo (${allowedDatesLabel}).`;

  return {
    baseDate,
    candidateDates,
    suggestedAdmissionDate,
    isSuspicious: true,
    message,
  };
};
