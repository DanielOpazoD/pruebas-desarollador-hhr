import { DailyRecord, DailyRecordPatch } from '@/types/core';
import {
  getRecordForDate as getRecordFromIndexedDB,
  saveRecord as saveToIndexedDB,
} from '@/services/storage/indexeddb/indexedDbRecordService';
import {
  saveRecordToFirestore,
  updateRecordPartial as updateRecordPartialToFirestore,
} from '@/services/storage/firestoreService';
import { isFirestoreEnabled } from '@/services/repositories/repositoryConfig';
import {
  createPartialUpdateDailyRecordCommand,
  createSaveDailyRecordCommand,
} from '@/services/repositories/contracts/dailyRecordCommands';
import {
  createSaveDailyRecordResult,
  createUpdatePartialDailyRecordResult,
} from '@/services/repositories/contracts/dailyRecordResults';
import {
  assertRemoteSaveCompatibility,
  resolveRemoteWriteRecovery,
  prepareDailyRecordForPersistence,
  preparePatchedRecordForPersistence,
  syncPatientsToMasterInBackground,
} from '@/services/repositories/dailyRecordWriteSupport';
import { logger } from '@/services/utils/loggerService';

interface RemoteWriteState {
  savedRemotely: boolean;
  queuedForRetry: boolean;
  autoMerged: boolean;
}

const dailyRecordWriteLogger = logger.child('DailyRecordWriteRepository');

const createRemoteWriteState = (): RemoteWriteState => ({
  savedRemotely: false,
  queuedForRetry: false,
  autoMerged: false,
});

const resolveWriteOutcome = (state: RemoteWriteState): 'clean' | 'queued' | 'auto_merged' => {
  if (state.autoMerged) {
    return 'auto_merged';
  }
  if (state.queuedForRetry) {
    return 'queued';
  }
  return 'clean';
};

const buildSaveResult = (date: string, state: RemoteWriteState) =>
  createSaveDailyRecordResult({
    date,
    outcome: resolveWriteOutcome(state),
    savedLocally: true,
    savedRemotely: state.savedRemotely,
    queuedForRetry: state.queuedForRetry,
    autoMerged: state.autoMerged,
  });

const buildPartialUpdateResult = (date: string, state: RemoteWriteState, patchedFields: number) =>
  createUpdatePartialDailyRecordResult({
    date,
    outcome: resolveWriteOutcome(state),
    savedLocally: true,
    updatedRemotely: state.savedRemotely,
    queuedForRetry: state.queuedForRetry,
    autoMerged: state.autoMerged,
    patchedFields,
  });

const runRemoteSaveIntegrityCheck = async (date: string, record: DailyRecord): Promise<void> => {
  if (!isFirestoreEnabled()) return;

  try {
    await assertRemoteSaveCompatibility(date, record);
  } catch (err) {
    if (
      err instanceof Error &&
      (err.name === 'DataRegressionError' || err.name === 'VersionMismatchError')
    ) {
      throw err;
    }
    dailyRecordWriteLogger.warn('Could not perform integrity check, proceeding anyway', err);
  }
};

const applyRemoteRecovery = async (
  date: string,
  record: DailyRecord,
  fields: string[],
  error: unknown,
  state: RemoteWriteState
): Promise<'continue' | 'return'> => {
  const recovery = await resolveRemoteWriteRecovery(date, record, fields, error);
  if (recovery.status === 'throw') {
    throw recovery.error;
  }

  state.queuedForRetry = recovery.queuedForRetry;
  state.autoMerged = recovery.autoMerged;
  return recovery.status === 'auto_merged' ? 'return' : 'continue';
};

export const saveDetailed = async (record: DailyRecord, expectedLastUpdated?: string) => {
  const command = createSaveDailyRecordCommand(record, expectedLastUpdated);
  const remoteState = createRemoteWriteState();
  const validatedRecord = prepareDailyRecordForPersistence(command.record, command.date);

  await runRemoteSaveIntegrityCheck(command.date, validatedRecord);

  await saveToIndexedDB(validatedRecord);

  if (isFirestoreEnabled()) {
    try {
      await saveRecordToFirestore(validatedRecord, command.expectedLastUpdated);
      remoteState.savedRemotely = true;
    } catch (err) {
      dailyRecordWriteLogger.warn(
        `Firestore sync failed for ${command.date}; data persisted in IndexedDB`,
        err
      );
      const nextAction = await applyRemoteRecovery(
        command.date,
        validatedRecord,
        ['*'],
        err,
        remoteState
      );
      if (nextAction === 'return') {
        return buildSaveResult(command.date, remoteState);
      }
    }
  }

  syncPatientsToMasterInBackground(validatedRecord);

  return buildSaveResult(command.date, remoteState);
};

export const save = async (record: DailyRecord, expectedLastUpdated?: string): Promise<void> => {
  await saveDetailed(record, expectedLastUpdated);
};

export const updatePartialDetailed = async (date: string, partialData: DailyRecordPatch) => {
  const command = createPartialUpdateDailyRecordCommand(date, partialData);
  const remoteState = createRemoteWriteState();
  const current = await getRecordFromIndexedDB(command.date);

  if (!current) {
    dailyRecordWriteLogger.warn(`No record found for ${command.date}; partial update aborted`);
    return createUpdatePartialDailyRecordResult({
      date: command.date,
      outcome: 'blocked',
      savedLocally: false,
      updatedRemotely: false,
      queuedForRetry: false,
      autoMerged: false,
      patchedFields: Object.keys(command.patch).length,
    });
  }

  const { record: validatedRecord, mergedPatches } = preparePatchedRecordForPersistence(
    current,
    command.date,
    command.patch
  );
  const patchedFields = Object.keys(mergedPatches).length;

  await saveToIndexedDB(validatedRecord);

  if (isFirestoreEnabled()) {
    try {
      await updateRecordPartialToFirestore(command.date, mergedPatches, current.lastUpdated);
      remoteState.savedRemotely = true;
    } catch (err) {
      dailyRecordWriteLogger.warn(`Firestore partial update failed for ${command.date}`, err);
      const nextAction = await applyRemoteRecovery(
        command.date,
        validatedRecord,
        Object.keys(mergedPatches),
        err,
        remoteState
      );
      if (nextAction === 'return') {
        return buildPartialUpdateResult(command.date, remoteState, patchedFields);
      }
    }
  }

  return buildPartialUpdateResult(command.date, remoteState, patchedFields);
};

export const updatePartial = async (date: string, partialData: DailyRecordPatch): Promise<void> => {
  await updatePartialDetailed(date, partialData);
};
