import type { ClinicalDocumentRecord } from '@/features/clinical-documents/domain/entities';
import type { UserRole } from '@/types';
import {
  canArchiveClinicalDocuments,
  canDeleteClinicalDocuments,
  canEditClinicalDocuments,
  canReadClinicalDocuments,
} from '@/application/clinical-documents/clinicalDocumentAccessPolicy';

export {
  canArchiveClinicalDocuments,
  canDeleteClinicalDocuments,
  canEditClinicalDocuments,
  canReadClinicalDocuments,
};

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
