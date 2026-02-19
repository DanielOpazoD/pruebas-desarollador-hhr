/**
 * Daily Record Repository
 * Provides a unified interface for accessing and persisting daily records.
 * Abstracts localStorage and Firestore operations.
 * Supports demo mode with isolated storage.
 */

import { DailyRecord } from '@/types';
import { DailyRecordPatch } from '@/types';
import { deleteRecord as deleteFromIndexedDB, deleteDemoRecord } from '../storage/indexedDBService';
import {
  deleteRecordFromFirestore,
  getRecordFromFirestore,
  moveRecordToTrash,
} from '../storage/firestoreService';
// import {
//     getActiveHospitalId
// } from '@/constants/firestorePaths';

// ============================================================================
// Configuration (imported from repositoryConfig)
// ============================================================================

export {
  setFirestoreEnabled,
  isFirestoreEnabled,
  setDemoModeActive,
  isDemoModeActive,
} from './repositoryConfig';
import { isFirestoreEnabled, isDemoModeActive } from './repositoryConfig';

// Re-export from dedicated modules
export { CatalogRepository } from './CatalogRepository';
export { migrateLegacyData } from './dataMigration';
import {
  getAvailableDates as getAvailableDatesFromReadService,
  getForDate as getForDateFromReadService,
  getForDateWithMeta as getForDateWithMetaFromReadService,
  getPreviousDay as getPreviousDayFromReadService,
} from './dailyRecordRepositoryReadService';
import {
  save as saveFromWriteService,
  updatePartial as updatePartialFromWriteService,
} from './dailyRecordRepositoryWriteService';
import {
  subscribe as subscribeFromSyncService,
  syncWithFirestore as syncWithFirestoreFromSyncService,
} from './dailyRecordRepositorySyncService';
import {
  copyPatientToDate as copyPatientToDateFromInitializationService,
  initializeDay as initializeDayFromInitializationService,
} from './dailyRecordRepositoryInitializationService';
import {
  createDeleteDayCommand,
  createInitializeDayCommand,
  createCopyPatientToDateCommand,
} from './contracts/dailyRecordLifecycleCommands';
import {
  createGetDailyRecordQuery,
  createGetPreviousDayQuery,
} from './contracts/dailyRecordQueries';
import {
  createPartialUpdateDailyRecordCommand,
  createSaveDailyRecordCommand,
} from './contracts/dailyRecordCommands';

// ============================================================================
// Repository Interface
// ============================================================================

export interface IDailyRecordRepository {
  getForDate(date: string): Promise<DailyRecord | null>;
  getPreviousDay(date: string): Promise<DailyRecord | null>;
  save(record: DailyRecord, expectedLastUpdated?: string): Promise<void>;
  subscribe(
    date: string,
    callback: (r: DailyRecord | null, hasPendingWrites: boolean) => void
  ): () => void;
  initializeDay(date: string, copyFromDate?: string): Promise<DailyRecord>;
  deleteDay(date: string): Promise<void>;
  getAllDates(): Promise<string[]>;
  updatePartial(date: string, patches: DailyRecordPatch): Promise<void>;
  copyPatientToDate(
    sourceDate: string,
    sourceBedId: string,
    targetDate: string,
    targetBedId: string
  ): Promise<void>;
}

// ============================================================================
// Repository Implementation
// ============================================================================

export const getForDate = async (date: string, syncFromRemote: boolean = true) => {
  const query = createGetDailyRecordQuery(date, syncFromRemote);
  return getForDateFromReadService(query.date, query.syncFromRemote);
};

export const getForDateWithMeta = async (date: string, syncFromRemote: boolean = true) => {
  const query = createGetDailyRecordQuery(date, syncFromRemote);
  return getForDateWithMetaFromReadService(query.date, query.syncFromRemote);
};

export const getPreviousDay = async (date: string) => {
  const query = createGetPreviousDayQuery(date);
  return getPreviousDayFromReadService(query.date);
};
export const getAvailableDates = getAvailableDatesFromReadService;

export const save = async (record: DailyRecord, expectedLastUpdated?: string) => {
  const command = createSaveDailyRecordCommand(record, expectedLastUpdated);
  return saveFromWriteService(command.record, command.expectedLastUpdated);
};

export const updatePartial = async (date: string, patches: DailyRecordPatch) => {
  const command = createPartialUpdateDailyRecordCommand(date, patches);
  return updatePartialFromWriteService(command.date, command.patch);
};
export const subscribe = (
  date: string,
  callback: (r: DailyRecord | null, hasPendingWrites: boolean) => void
) => {
  const query = createGetDailyRecordQuery(date, true);
  return subscribeFromSyncService(query.date, callback);
};
export const syncWithFirestore = syncWithFirestoreFromSyncService;

export const initializeDay = async (date: string, copyFromDate?: string) => {
  const command = createInitializeDayCommand(date, copyFromDate);
  return initializeDayFromInitializationService(command.date, command.copyFromDate);
};

/**
 * Deletes a daily record from both local and remote storage.
 */
export const deleteDay = async (date: string): Promise<void> => {
  const command = createDeleteDayCommand(date);

  if (isDemoModeActive()) {
    await deleteDemoRecord(command.date);
  } else {
    // 1. Local Delete (IndexedDB)
    await deleteFromIndexedDB(command.date);

    // 2. Soft Delete in Firestore (Move to trash)
    if (isFirestoreEnabled()) {
      try {
        const record = await getRecordFromFirestore(command.date);
        if (record) {
          // Create a snapshot in the deletedRecords collection
          // Note: This requires a new helper in firestoreService or direct access
          // For now, I'll use saveRecordToFirestore with a custom path if possible,
          // or just implement moveRecordToTrash in firestoreService.
          await moveRecordToTrash(record);
        }
        await deleteRecordFromFirestore(command.date);
      } catch (error) {
        console.error('Failed to soft-delete from Firestore:', error);
        // Fallback to hard delete if move fails? No, better to keep it and report error.
      }
    }
  }
};

export const copyPatientToDate = async (
  sourceDate: string,
  sourceBedId: string,
  targetDate: string,
  targetBedId: string
) => {
  const command = createCopyPatientToDateCommand(sourceDate, sourceBedId, targetDate, targetBedId);
  return copyPatientToDateFromInitializationService(
    command.sourceDate,
    command.sourceBedId,
    command.targetDate,
    command.targetBedId
  );
};

// ============================================================================
// Repository Object Export (Alternative API)
// ============================================================================

export const DailyRecordRepository: IDailyRecordRepository & {
  syncWithFirestore: typeof syncWithFirestore;
} = {
  getForDate,
  getPreviousDay,
  save,
  subscribe,
  initializeDay,
  deleteDay,
  updatePartial,
  copyPatientToDate,
  syncWithFirestore,
  getAllDates: getAvailableDates,
};
