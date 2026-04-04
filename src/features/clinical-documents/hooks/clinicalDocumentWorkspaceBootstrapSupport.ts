import type {
  ClinicalDocumentRecord,
  ClinicalDocumentTemplate,
} from '@/features/clinical-documents/domain/entities';

export const resolveSelectedClinicalTemplateId = (
  templates: ClinicalDocumentTemplate[],
  selectedTemplateId: string
): string => {
  if (templates.some(template => template.id === selectedTemplateId)) {
    return selectedTemplateId;
  }

  return templates[0]?.id || 'epicrisis';
};

export const shouldSeedClinicalDocumentTemplates = ({
  isActive,
  role,
  hasLoadedRemoteTemplates,
  remoteTemplateCount,
}: {
  isActive: boolean;
  role: string;
  hasLoadedRemoteTemplates: boolean;
  remoteTemplateCount: number | null;
}): boolean =>
  isActive &&
  role === 'admin' &&
  hasLoadedRemoteTemplates &&
  remoteTemplateCount !== null &&
  remoteTemplateCount === 0;

export const resolveNextSelectedClinicalDocumentId = (
  documents: ClinicalDocumentRecord[],
  previousSelectedDocumentId: string | null
): string | null => {
  if (!previousSelectedDocumentId) {
    return documents[0]?.id || null;
  }

  return documents.some(document => document.id === previousSelectedDocumentId)
    ? previousSelectedDocumentId
    : documents[0]?.id || null;
};
