import {
  deleteDoc,
  setDoc,
  Timestamp,
  updateDoc,
  type DocumentData,
  type UpdateData,
} from 'firebase/firestore';
import type { DailyRecord, DailyRecordPatch } from '@/services/storage/storageDailyRecordContracts';
import { withRetry } from '@/utils/networkUtils';
import {
  flattenObject,
  getRecordDocRef,
  sanitizeForFirestore,
} from '@/services/storage/firestore/firestoreShared';
import {
  asFirestoreUpdatePayload,
  assertFirestoreConcurrency,
  createDeletedRecordRef,
  saveHistorySnapshot,
} from '@/services/storage/firestore/firestoreWriteSupport';
import { firestoreWriteLogger } from '@/services/storage/storageLoggers';

const logFirestoreWriteRetry = (
  operation: 'save' | 'partialUpdate' | 'delete',
  date: string,
  attempt: number,
  error: unknown
): void => {
  firestoreWriteLogger.warn(`Firestore write retry: ${operation}`, {
    attempt,
    date,
    error,
  });
};

const logFirestoreWriteError = (
  operation: 'save' | 'partialUpdate' | 'delete' | 'moveToTrash',
  date: string,
  error: unknown
): void => {
  firestoreWriteLogger.error(`Firestore write failed: ${operation}`, {
    date,
    error,
  });
};

export { ConcurrencyError } from '@/services/storage/firestore/firestoreWriteSupport';

export const saveRecordToFirestore = async (
  record: DailyRecord,
  expectedLastUpdated?: string
): Promise<void> => {
  try {
    const docRef = getRecordDocRef(record.date);
    await assertFirestoreConcurrency(
      docRef,
      expectedLastUpdated,
      'El registro ha sido modificado por otro usuario. Por favor recarga la página.',
      'save'
    );

    await saveHistorySnapshot(record.date);

    const sanitizedRecord = sanitizeForFirestore({
      ...record,
      lastUpdated: Timestamp.now(),
    });

    await withRetry(() => setDoc(docRef, sanitizedRecord as Record<string, unknown>), {
      onRetry: (err: unknown, attempt: number) =>
        logFirestoreWriteRetry('save', record.date, attempt, err),
    });
  } catch (error) {
    logFirestoreWriteError('save', record.date, error);
    throw error;
  }
};

export const updateRecordPartial = async (
  date: string,
  partialData: DailyRecordPatch,
  expectedLastUpdated?: string
): Promise<void> => {
  try {
    const docRef = getRecordDocRef(date);
    await assertFirestoreConcurrency(
      docRef,
      expectedLastUpdated,
      'El registro ha sido modificado por otro usuario. Por favor recarga la página.',
      'partial update'
    );

    await saveHistorySnapshot(date);

    const flatData = flattenObject(partialData as unknown as Record<string, unknown>);
    const sanitizedData = sanitizeForFirestore({
      ...flatData,
      lastUpdated: Timestamp.now(),
    }) as Record<string, unknown>;

    try {
      await withRetry(
        () =>
          updateDoc(docRef, asFirestoreUpdatePayload(sanitizedData) as UpdateData<DocumentData>),
        {
          onRetry: (err: unknown, attempt: number) =>
            logFirestoreWriteRetry('partialUpdate', date, attempt, err),
        }
      );
    } catch (error: unknown) {
      const storageError = error as { code?: string };
      if (storageError?.code === 'not-found') {
        firestoreWriteLogger.warn('Firestore write fallback: partialUpdateNotFound', { date });
        await withRetry(() => setDoc(docRef, sanitizedData, { merge: true }));
      } else {
        throw error;
      }
    }
  } catch (error) {
    logFirestoreWriteError('partialUpdate', date, error);
    throw error;
  }
};

export const deleteRecordFromFirestore = async (date: string): Promise<void> => {
  try {
    const docRef = getRecordDocRef(date);
    await withRetry(() => deleteDoc(docRef), {
      onRetry: (err: unknown, attempt: number) =>
        logFirestoreWriteRetry('delete', date, attempt, err),
    });
  } catch (error) {
    logFirestoreWriteError('delete', date, error);
    throw error;
  }
};

export const moveRecordToTrash = async (record: DailyRecord): Promise<void> => {
  try {
    const trashRef = createDeletedRecordRef(record.date);

    await withRetry(() =>
      setDoc(trashRef, {
        ...(sanitizeForFirestore(record) as Record<string, unknown>),
        deletedAt: Timestamp.now(),
        originalDate: record.date,
      })
    );
  } catch (error) {
    logFirestoreWriteError('moveToTrash', record.date, error);
    throw error;
  }
};
