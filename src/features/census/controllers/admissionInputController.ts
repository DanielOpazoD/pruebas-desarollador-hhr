import { getTodayISO, normalizeDateOnly } from '@/utils/dateUtils';
import {
  resolveAdmissionDateAudit as resolveAdmissionDateAuditPolicy,
  type AdmissionDateAuditResolution,
} from '@/application/patient-flow/admissionDatePolicy';

export interface AdmissionDateChangeResolution {
  admissionDate: string;
  admissionTime?: string;
  shouldPatchMultiple: boolean;
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

export const resolveAdmissionDateIsEditable = ({
  recordDate,
  firstSeenDate,
  isNewAdmission,
}: {
  recordDate: string;
  firstSeenDate?: string;
  isNewAdmission: boolean;
}): boolean => {
  // Admission stays editable only on the first observed census day of the episode.
  const normalizedRecordDate = normalizeDateOnly(recordDate);
  const normalizedFirstSeenDate = normalizeDateOnly(firstSeenDate);

  if (normalizedRecordDate && normalizedFirstSeenDate) {
    return normalizedRecordDate === normalizedFirstSeenDate;
  }

  return isNewAdmission;
};

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
}): AdmissionDateAuditResolution =>
  resolveAdmissionDateAuditPolicy({ recordDate, admissionDate, admissionTime, firstSeenDate });
