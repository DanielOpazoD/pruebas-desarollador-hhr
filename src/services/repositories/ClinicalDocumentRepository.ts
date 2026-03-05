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

const hydrateLegacyRecordDefaults = (record: ClinicalDocumentRecord): ClinicalDocumentRecord => ({
  ...record,
  patientInfoTitle: record.patientInfoTitle || 'Información del Paciente',
  footerMedicoLabel: record.footerMedicoLabel || 'Médico',
  footerEspecialidadLabel: record.footerEspecialidadLabel || 'Especialidad',
  audit: {
    ...record.audit,
    signatureRevocations: Array.isArray(record.audit.signatureRevocations)
      ? record.audit.signatureRevocations
      : [],
  },
});

const sanitizeForFirestore = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value
      .map(item => sanitizeForFirestore(item))
      .filter(item => item !== undefined) as unknown as T;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .map(([key, nested]) => [key, sanitizeForFirestore(nested)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
};

const enrichRecord = (record: ClinicalDocumentRecord): ClinicalDocumentRecord => {
  const hydrated = hydrateLegacyRecordDefaults(record);
  const renderedText = buildClinicalDocumentRenderedText(hydrated);
  return {
    ...hydrated,
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
    return sortDocuments(documents.map(document => hydrateLegacyRecordDefaults(document)));
  },

  async get(
    documentId: string,
    hospitalId: string = getActiveHospitalId()
  ): Promise<ClinicalDocumentRecord | null> {
    const document = await db.getDoc<ClinicalDocumentRecord>(
      getClinicalDocumentsCollectionPath(hospitalId),
      documentId
    );
    return document ? hydrateLegacyRecordDefaults(document) : null;
  },

  async createDraft(
    record: ClinicalDocumentRecord,
    hospitalId: string = getActiveHospitalId()
  ): Promise<ClinicalDocumentRecord> {
    const enriched = sanitizeForFirestore(enrichRecord(record));
    await db.setDoc(getClinicalDocumentsCollectionPath(hospitalId), record.id, enriched);
    return enriched;
  },

  async saveDraft(
    record: ClinicalDocumentRecord,
    hospitalId: string = getActiveHospitalId()
  ): Promise<ClinicalDocumentRecord> {
    const enriched = sanitizeForFirestore(enrichRecord(record));
    await db.setDoc(getClinicalDocumentsCollectionPath(hospitalId), record.id, enriched, {
      merge: true,
    });
    return enriched;
  },

  async sign(
    record: ClinicalDocumentRecord,
    hospitalId: string = getActiveHospitalId()
  ): Promise<ClinicalDocumentRecord> {
    const enriched = sanitizeForFirestore(
      enrichRecord({
        ...record,
        isLocked: true,
        status: 'signed',
      })
    );
    await db.setDoc(getClinicalDocumentsCollectionPath(hospitalId), record.id, enriched, {
      merge: true,
    });
    return enriched;
  },

  async unsign(
    record: ClinicalDocumentRecord,
    hospitalId: string = getActiveHospitalId()
  ): Promise<ClinicalDocumentRecord> {
    const enriched = sanitizeForFirestore(
      enrichRecord({
        ...record,
        isLocked: false,
        status: 'draft',
      })
    );
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
    await db.updateDoc(getClinicalDocumentsCollectionPath(hospitalId), documentId, {
      pdf: sanitizeForFirestore(pdf),
    });
  },

  subscribeByEpisode(
    episodeKey: string,
    callback: (documents: ClinicalDocumentRecord[]) => void,
    hospitalId: string = getActiveHospitalId()
  ): () => void {
    return db.subscribeQuery<ClinicalDocumentRecord>(
      getClinicalDocumentsCollectionPath(hospitalId),
      { where: [{ field: 'episodeKey', operator: '==', value: episodeKey }] },
      docs => callback(sortDocuments(docs.map(document => hydrateLegacyRecordDefaults(document))))
    );
  },

  async delete(documentId: string, hospitalId: string = getActiveHospitalId()): Promise<void> {
    await db.deleteDoc(getClinicalDocumentsCollectionPath(hospitalId), documentId);
  },
};
