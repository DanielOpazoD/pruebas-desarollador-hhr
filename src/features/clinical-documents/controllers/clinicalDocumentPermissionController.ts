import type { ClinicalDocumentRecord } from '@/features/clinical-documents/domain/entities';
import type { UserRole } from '@/types';

export const canReadClinicalDocuments = (role: UserRole | undefined): boolean =>
  role === 'admin' || role === 'doctor_urgency' || role === 'nurse_hospital';

export const canEditClinicalDocuments = (role: UserRole | undefined): boolean =>
  role === 'admin' || role === 'doctor_urgency';

export const canArchiveClinicalDocuments = (role: UserRole | undefined): boolean =>
  role === 'admin';

export const canSignClinicalDocument = (
  role: UserRole | undefined,
  record: ClinicalDocumentRecord
): boolean =>
  canEditClinicalDocuments(role) && record.status !== 'signed' && record.status !== 'archived';
