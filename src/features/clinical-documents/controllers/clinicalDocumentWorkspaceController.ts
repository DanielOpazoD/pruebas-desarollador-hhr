import type {
  ClinicalDocumentEpisodeContext,
  ClinicalDocumentRecord,
} from '@/features/clinical-documents/domain/entities';
import type { ConfirmOptions } from '@/context/uiContracts';
import { getClinicalDocumentDefinition } from '@/features/clinical-documents/domain/definitions';
import { hydrateLegacyClinicalDocument as hydrateLegacyClinicalDocumentCompat } from '@/features/clinical-documents/controllers/clinicalDocumentCompatibilityController';
import {
  formatClinicalDocumentDateTime as formatClinicalDocumentDateTimePresentation,
  formatClinicalDocumentPdfDate,
  resolveClinicalDocumentSourceDateLabel,
} from '@/shared/clinical-documents/clinicalDocumentPresentation';

export const serializeClinicalDocument = (record: ClinicalDocumentRecord | null): string =>
  record ? JSON.stringify(record) : '';

export const hydrateLegacyClinicalDocument = (
  record: ClinicalDocumentRecord
): ClinicalDocumentRecord => hydrateLegacyClinicalDocumentCompat(record);

export const formatClinicalDocumentDateTime = (isoString?: string): string => {
  return formatClinicalDocumentDateTimePresentation(isoString);
};

export const getClinicalDocumentPatientFieldGridClass = (fieldId: string): string =>
  `clinical-document-patient-field stacked clinical-document-patient-field--${fieldId}`;

export const formatClinicalDocumentAuthorName = (value?: string | null): string => {
  const normalized = (value || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return 'Usuario';
  }

  const tokens = normalized.split(' ').filter(Boolean);
  if (tokens.length === 1) {
    return tokens[0];
  }

  if (tokens.length === 2) {
    return `${tokens[0]} ${tokens[1]}`;
  }

  return `${tokens[0]} ${tokens[tokens.length - 2]}`;
};

export const getClinicalDocumentPatientFieldLabel = (
  field: ClinicalDocumentRecord['patientFields'][number],
  documentType: ClinicalDocumentRecord['documentType']
): string => {
  const definition = getClinicalDocumentDefinition(documentType);
  return definition.resolvePatientFieldLabel?.(field) || field.label;
};

export const resizeClinicalDocumentSectionTextarea = (
  textarea: HTMLTextAreaElement | null
): void => {
  if (!textarea) return;
  textarea.style.height = 'auto';
  const minHeight = 92;
  textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
};

export const buildClinicalDocumentActor = (
  user: {
    uid?: string;
    email?: string | null;
    displayName?: string | null;
  } | null,
  role: string | null | undefined
) => ({
  uid: user?.uid || '',
  email: user?.email || '',
  displayName: formatClinicalDocumentAuthorName(user?.displayName || user?.email || 'Usuario'),
  role: role || 'viewer',
});

const resolveClinicalDocumentPdfDate = (record: ClinicalDocumentRecord): string => {
  const reportDate = record.patientFields.find(field => field.id === 'finf')?.value;
  return (
    formatClinicalDocumentPdfDate(reportDate) ||
    resolveClinicalDocumentSourceDateLabel(record.sourceDailyRecordDate) ||
    formatClinicalDocumentPdfDate(record.audit.updatedAt) ||
    'Sin fecha'
  );
};

const resolveClinicalDocumentPdfPatientName = (record: ClinicalDocumentRecord): string => {
  const fieldName = record.patientFields.find(field => field.id === 'nombre')?.value?.trim();
  const patientName = record.patientName.trim();
  return (fieldName || patientName || 'Paciente').replace(/\s+/g, ' ');
};

export const buildClinicalDocumentPdfFileName = (record: ClinicalDocumentRecord): string =>
  `${resolveClinicalDocumentPdfDate(record)} - ${resolveClinicalDocumentPdfPatientName(record)}.pdf`;

export const buildClinicalDocumentWorkspaceNotifyPort = (
  success: (title: string, message?: string) => void,
  warning: (title: string, message?: string) => void,
  notifyError: (title: string, message?: string) => void,
  info: (title: string, message?: string) => void,
  confirm: (options: ConfirmOptions) => Promise<boolean>
) => ({
  success,
  warning,
  error: notifyError,
  info,
  confirm,
});

export type ClinicalDocumentWorkspaceEpisode = ClinicalDocumentEpisodeContext;
