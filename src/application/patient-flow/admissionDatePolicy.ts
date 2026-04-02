import {
  getNextDay,
  normalizeDateOnly,
  parseTimeMinutes,
  resolveClinicalDayBounds,
} from '@/utils/dateUtils';

export interface AdmissionDatePolicyInput {
  recordDate: string;
  admissionDate?: string;
  admissionTime?: string;
  firstSeenDate?: string;
}

export interface AdmissionDateAuditResolution {
  baseDate: string;
  candidateDates: string[];
  suggestedAdmissionDate: string;
  isSuspicious: boolean;
  message?: string;
}

export const resolveAdmissionDateSuggestion = (
  baseDate?: string,
  admissionTime?: string
): string => {
  const normalizedBaseDate = normalizeDateOnly(baseDate);
  if (!normalizedBaseDate) return '';

  const timeMinutes = parseTimeMinutes(admissionTime);
  if (timeMinutes === null) {
    return normalizedBaseDate;
  }

  const { nightEndMinutes } = resolveClinicalDayBounds(normalizedBaseDate);
  return timeMinutes < nightEndMinutes ? getNextDay(normalizedBaseDate) : normalizedBaseDate;
};

export const resolveAdmissionDateAudit = ({
  recordDate,
  admissionDate,
  admissionTime,
  firstSeenDate,
}: AdmissionDatePolicyInput): AdmissionDateAuditResolution => {
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
    resolveAdmissionDateSuggestion(baseDate, admissionTime) || baseDate;
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
