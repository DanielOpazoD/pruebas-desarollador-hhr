import type { GeneratedDocument } from '@/types/transferDocuments';

import { buildTransferDocumentFileName } from './transferDocumentNamingController';

export const createGeneratedDocument = (
  templateId: string,
  displayName: string,
  patientName: string,
  extension: string,
  mimeType: string,
  blob: Blob
): GeneratedDocument => ({
  templateId,
  fileName: buildTransferDocumentFileName(displayName, patientName, extension),
  mimeType,
  blob,
  generatedAt: new Date().toISOString(),
});
