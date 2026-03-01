import { DailyRecord, DailyRecordPatch } from '@/types';
import {
  getRecordForDate as getRecordFromIndexedDB,
  saveRecord as saveToIndexedDB,
} from '@/services/storage/indexedDBService';
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

export const save = async (record: DailyRecord, expectedLastUpdated?: string): Promise<void> => {
  const command = createSaveDailyRecordCommand(record, expectedLastUpdated);
  let savedRemotely = false;
  let queuedForRetry = false;
  let autoMerged = false;

  const validatedRecord = prepareDailyRecordForPersistence(command.record, command.date);

  if (isFirestoreEnabled()) {
    try {
      await assertRemoteSaveCompatibility(command.date, validatedRecord);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.name === 'DataRegressionError' || err.name === 'VersionMismatchError')
      ) {
        throw err;
      }
      console.warn('[Repository] Could not perform integrity check, proceeding:', err);
    }
  }

  await saveToIndexedDB(validatedRecord);

  if (isFirestoreEnabled()) {
    try {
      await saveRecordToFirestore(validatedRecord, command.expectedLastUpdated);
      savedRemotely = true;
    } catch (err) {
      console.warn('Firestore sync failed, data saved in IndexedDB:', err);
      const recovery = await resolveRemoteWriteRecovery(command.date, validatedRecord, ['*'], err);
      if (recovery.status === 'throw') {
        throw recovery.error;
      }
      queuedForRetry = recovery.queuedForRetry;
      autoMerged = recovery.autoMerged;
      if (recovery.status === 'auto_merged') {
        createSaveDailyRecordResult({
          date: command.date,
          savedLocally: true,
          savedRemotely: false,
          queuedForRetry,
          autoMerged,
        });
        return;
      }
    }
  }

  syncPatientsToMasterInBackground(validatedRecord);

  createSaveDailyRecordResult({
    date: command.date,
    savedLocally: true,
    savedRemotely,
    queuedForRetry,
    autoMerged,
  });
};

export const updatePartial = async (date: string, partialData: DailyRecordPatch): Promise<void> => {
  const command = createPartialUpdateDailyRecordCommand(date, partialData);
  let updatedRemotely = false;
  let queuedForRetry = false;
  let autoMerged = false;

  const current = await getRecordFromIndexedDB(command.date);

  if (!current) {
    console.warn(
      `[Repository] updatePartial: No record found for ${command.date}, operation aborted.`
    );
    return;
  }

  const { record: validatedRecord, mergedPatches } = preparePatchedRecordForPersistence(
    current,
    command.date,
    command.patch
  );

  await saveToIndexedDB(validatedRecord);

  if (isFirestoreEnabled()) {
    try {
      await updateRecordPartialToFirestore(command.date, mergedPatches, current.lastUpdated);
      updatedRemotely = true;
    } catch (err) {
      console.warn('[Repository] Firestore partial update failed:', err);
      const recovery = await resolveRemoteWriteRecovery(
        command.date,
        validatedRecord,
        Object.keys(mergedPatches),
        err
      );
      if (recovery.status === 'throw') {
        throw recovery.error;
      }
      queuedForRetry = recovery.queuedForRetry;
      autoMerged = recovery.autoMerged;
      if (recovery.status === 'auto_merged') {
        createUpdatePartialDailyRecordResult({
          date: command.date,
          savedLocally: true,
          updatedRemotely: false,
          queuedForRetry,
          autoMerged,
          patchedFields: Object.keys(mergedPatches).length,
        });
        return;
      }
    }
  }

  createUpdatePartialDailyRecordResult({
    date: command.date,
    savedLocally: true,
    updatedRemotely,
    queuedForRetry,
    autoMerged,
    patchedFields: Object.keys(mergedPatches).length,
  });
};
