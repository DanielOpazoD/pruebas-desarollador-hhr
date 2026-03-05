import type { ClinicalDocumentRecord } from '@/features/clinical-documents/domain/entities';
import type { UserRole } from '@/types';

export const canReadClinicalDocuments = (role: UserRole | undefined): boolean =>
  role === 'admin' || role === 'doctor_urgency' || role === 'nurse_hospital' || role === 'editor';

export const canEditClinicalDocuments = (role: UserRole | undefined): boolean =>
  role === 'admin' || role === 'doctor_urgency';

export const canArchiveClinicalDocuments = (role: UserRole | undefined): boolean =>
  role === 'admin';

export const canDeleteClinicalDocuments = (role: UserRole | undefined): boolean =>
  role === 'admin' || role === 'doctor_urgency' || role === 'nurse_hospital' || role === 'editor';

export const canSignClinicalDocument = (
  role: UserRole | undefined,
  record: ClinicalDocumentRecord
): boolean =>
  canEditClinicalDocuments(role) && record.status !== 'signed' && record.status !== 'archived';

const isSameCalendarDay = (leftIso: string, right: Date): boolean => {
  const left = new Date(leftIso);
  if (Number.isNaN(left.getTime())) {
    return false;
  }

  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
};

export const canUnsignClinicalDocument = (
  role: UserRole | undefined,
  record: ClinicalDocumentRecord,
  now: Date = new Date()
): boolean =>
  canEditClinicalDocuments(role) &&
  record.documentType === 'epicrisis' &&
  record.status === 'signed' &&
  typeof record.audit.signedAt === 'string' &&
  isSameCalendarDay(record.audit.signedAt, now);
