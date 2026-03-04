import { db } from '@/services/infrastructure/db';
import { getActiveHospitalId } from '@/constants/firestorePaths';
import type {
  ClinicalDocumentPdfMeta,
  ClinicalDocumentRecord,
} from '@/features/clinical-documents/domain/entities';
import { buildClinicalDocumentRenderedText } from '@/features/clinical-documents/domain/factories';
import { createHash } from '@/features/clinical-documents/utils/hash';

const getClinicalDocumentsCollectionPath = (hospitalId: string = getActiveHospitalId()): string =>
  `hospitals/${hospitalId}/clinicalDocuments`;

const sortDocuments = (documents: ClinicalDocumentRecord[]): ClinicalDocumentRecord[] =>
  [...documents].sort((left, right) => right.audit.updatedAt.localeCompare(left.audit.updatedAt));

const enrichRecord = (record: ClinicalDocumentRecord): ClinicalDocumentRecord => {
  const renderedText = buildClinicalDocumentRenderedText(record);
  return {
    ...record,
    renderedText,
    integrityHash: createHash(renderedText),
  };
};

export const ClinicalDocumentRepository = {
  async listByEpisode(
    episodeKey: string,
    hospitalId: string = getActiveHospitalId()
  ): Promise<ClinicalDocumentRecord[]> {
    const documents = await db.getDocs<ClinicalDocumentRecord>(
      getClinicalDocumentsCollectionPath(hospitalId),
      {
        where: [{ field: 'episodeKey', operator: '==', value: episodeKey }],
      }
    );
    return sortDocuments(documents);
  },

  async get(
    documentId: string,
    hospitalId: string = getActiveHospitalId()
  ): Promise<ClinicalDocumentRecord | null> {
    return db.getDoc<ClinicalDocumentRecord>(
      getClinicalDocumentsCollectionPath(hospitalId),
      documentId
    );
  },

  async createDraft(
    record: ClinicalDocumentRecord,
    hospitalId: string = getActiveHospitalId()
  ): Promise<ClinicalDocumentRecord> {
    const enriched = enrichRecord(record);
    await db.setDoc(getClinicalDocumentsCollectionPath(hospitalId), record.id, enriched);
    return enriched;
  },

  async saveDraft(
    record: ClinicalDocumentRecord,
    hospitalId: string = getActiveHospitalId()
  ): Promise<ClinicalDocumentRecord> {
    const enriched = enrichRecord(record);
    await db.setDoc(getClinicalDocumentsCollectionPath(hospitalId), record.id, enriched, {
      merge: true,
    });
    return enriched;
  },

  async sign(
    record: ClinicalDocumentRecord,
    hospitalId: string = getActiveHospitalId()
  ): Promise<ClinicalDocumentRecord> {
    const enriched = enrichRecord({
      ...record,
      isLocked: true,
      status: 'signed',
    });
    await db.setDoc(getClinicalDocumentsCollectionPath(hospitalId), record.id, enriched, {
      merge: true,
    });
    return enriched;
  },

  async archive(
    documentId: string,
    patch: Pick<ClinicalDocumentRecord, 'status' | 'audit'>,
    hospitalId: string = getActiveHospitalId()
  ): Promise<void> {
    await db.updateDoc(getClinicalDocumentsCollectionPath(hospitalId), documentId, {
      status: patch.status,
      audit: patch.audit,
      isActiveEpisodeDocument: false,
    });
  },

  async savePdfMetadata(
    documentId: string,
    pdf: ClinicalDocumentPdfMeta,
    hospitalId: string = getActiveHospitalId()
  ): Promise<void> {
    await db.updateDoc(getClinicalDocumentsCollectionPath(hospitalId), documentId, { pdf });
  },

  subscribeByEpisode(
    episodeKey: string,
    callback: (documents: ClinicalDocumentRecord[]) => void,
    hospitalId: string = getActiveHospitalId()
  ): () => void {
    return db.subscribeQuery<ClinicalDocumentRecord>(
      getClinicalDocumentsCollectionPath(hospitalId),
      { where: [{ field: 'episodeKey', operator: '==', value: episodeKey }] },
      docs => callback(sortDocuments(docs))
    );
  },
};
