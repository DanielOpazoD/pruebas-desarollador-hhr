import { DailyRecord } from '@/types';
import { saveRecord as saveToIndexedDB } from '@/services/storage/indexedDBService';
import { isFirestoreEnabled } from '@/services/repositories/repositoryConfig';
import { clonePatient } from '@/services/factories/patientFactory';
import { getForDate } from '@/services/repositories/dailyRecordRepositoryReadService';
import { save } from '@/services/repositories/dailyRecordRepositoryWriteService';
import { loadRemoteRecordWithFallback } from '@/services/repositories/dailyRecordRemoteLoader';
import {
  buildInitializedDayRecord,
  enrichInitializationRecordFromCopySource,
} from '@/services/repositories/dailyRecordInitializationSupport';
import {
  createCopySourceInitializationSeed,
  createFreshInitializationSeed,
  createRemoteInitializationSeed,
  DailyRecordInitializationSeed,
} from '@/services/repositories/dailyRecordInitializationSeed';

const loadCopySourceRecord = async (copyFromDate?: string): Promise<DailyRecord | null> => {
  if (!copyFromDate) return null;
  return getForDate(copyFromDate);
};

const loadRemoteInitializationSeed = async (
  date: string,
  copySourceRecord: DailyRecord | null
): Promise<DailyRecordInitializationSeed | null> => {
  try {
    const remoteResult = await loadRemoteRecordWithFallback(date);
    if (!remoteResult.record) return null;

    const enrichedRecord = enrichInitializationRecordFromCopySource(
      remoteResult.record,
      copySourceRecord
    );
    if (copySourceRecord) {
      await saveToIndexedDB(enrichedRecord);
    }

    return createRemoteInitializationSeed({
      ...remoteResult,
      record: enrichedRecord,
    });
  } catch (err) {
    console.warn(`[Repository] Failed to check remote sources for ${date} during init:`, err);
    return null;
  }
};

const resolveInitializationSeed = async (
  date: string,
  copySourceRecord: DailyRecord | null
): Promise<DailyRecordInitializationSeed> => {
  if (isFirestoreEnabled()) {
    const remoteSeed = await loadRemoteInitializationSeed(date, copySourceRecord);
    if (remoteSeed?.record) {
      return remoteSeed;
    }
  }

  if (copySourceRecord) {
    return createCopySourceInitializationSeed(copySourceRecord);
  }

  return createFreshInitializationSeed();
};

export const initializeDay = async (date: string, copyFromDate?: string): Promise<DailyRecord> => {
  const existing = await getForDate(date);
  if (existing) return existing;

  const copySourceRecord = await loadCopySourceRecord(copyFromDate);
  const initializationSeed = await resolveInitializationSeed(date, copySourceRecord);

  if (initializationSeed.record && initializationSeed.source !== 'copy_source') {
    return initializationSeed.record;
  }

  const newRecord = buildInitializedDayRecord(date, initializationSeed.record);

  await save(newRecord);
  return newRecord;
};

export const copyPatientToDate = async (
  sourceDate: string,
  sourceBedId: string,
  targetDate: string,
  targetBedId: string
): Promise<void> => {
  const sourceRecord = await getForDate(sourceDate);
  if (!sourceRecord) throw new Error(`Source record for ${sourceDate} not found`);

  const sourcePatient = sourceRecord.beds[sourceBedId];
  if (!sourcePatient || !sourcePatient.patientName) {
    throw new Error(`No patient found in bed ${sourceBedId} on ${sourceDate}`);
  }

  let targetRecord = await getForDate(targetDate);
  if (!targetRecord) {
    targetRecord = await initializeDay(targetDate);
  }

  const clonedPatient = clonePatient(sourcePatient);
  clonedPatient.cudyr = undefined;
  if (clonedPatient.clinicalCrib) {
    clonedPatient.clinicalCrib.cudyr = undefined;
  }

  const nightNote = sourcePatient.handoffNoteNightShift || sourcePatient.handoffNote || '';
  clonedPatient.handoffNoteDayShift = nightNote;
  clonedPatient.handoffNoteNightShift = nightNote;

  targetRecord.beds[targetBedId] = clonedPatient;
  targetRecord.lastUpdated = new Date().toISOString();

  await save(targetRecord);
};
