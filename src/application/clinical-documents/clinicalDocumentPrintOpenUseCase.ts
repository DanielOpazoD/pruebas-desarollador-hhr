import type { ClinicalDocumentRecord } from '@/features/clinical-documents/domain/entities';
import { openClinicalDocumentBrowserPrintPreview } from '@/features/clinical-documents/services/clinicalDocumentPrintPdfService';

export const executeOpenClinicalDocumentPrint = (
  record: ClinicalDocumentRecord
): Promise<boolean> => openClinicalDocumentBrowserPrintPreview(record.title, record.documentType);
