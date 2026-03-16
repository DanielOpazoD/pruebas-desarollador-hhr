import {
  getForDate,
  getForDateWithMeta,
  getPreviousDay,
  getPreviousDayWithMeta,
  getAvailableDates,
} from '@/services/repositories/dailyRecordRepositoryReadService';
import { initializeDayDetailed } from '@/services/repositories/dailyRecordRepositoryInitializationService';
import { updatePartial, save } from '@/services/repositories/dailyRecordRepositoryWriteService';
import { syncWithFirestoreDetailed } from '@/services/repositories/dailyRecordRepositorySyncService';
import { deleteDailyRecordAcrossStores } from '@/services/repositories/dailyRecordRepositoryFacadeSupport';
import { getMonthRecordsFromFirestore } from '@/services/storage/firestoreService';
import type { DailyRecord, DailyRecordPatch } from '@/types/core';
import type { SyncDailyRecordResult } from '@/services/repositories/contracts/dailyRecordResults';
import type { DailyRecordInitializationResult } from '@/services/repositories/dailyRecordRepositoryInitializationService';
import type { DailyRecordReadResult } from '@/services/repositories/contracts/dailyRecordQueries';

export interface DailyRecordReadPort {
  getPreviousDay: (date: string) => Promise<DailyRecord | null>;
  getAvailableDates: () => Promise<string[]>;
  getMonthRecords: (year: number, monthZeroBased: number) => Promise<DailyRecord[]>;
  getForDate: (date: string) => Promise<DailyRecord | null>;
  getForDateWithMeta: (date: string, syncFromRemote?: boolean) => Promise<DailyRecordReadResult>;
  initializeDay: (
    date: string,
    copyFromDate?: string
  ) => Promise<DailyRecordInitializationResult | DailyRecord>;
  getPreviousDayWithMeta: (date: string) => Promise<DailyRecordReadResult>;
}

export interface DailyRecordWritePort {
  updatePartial: (date: string, patch: DailyRecordPatch) => Promise<void>;
  save: (record: DailyRecord, expectedLastUpdated?: string) => Promise<void>;
  delete: (date: string) => Promise<void>;
}

export interface DailyRecordSyncPort {
  syncWithFirestoreDetailed: (date: string) => Promise<SyncDailyRecordResult | null>;
}

export const defaultDailyRecordReadPort: DailyRecordReadPort = {
  getPreviousDay: async date => getPreviousDay(date),
  getAvailableDates: async () => getAvailableDates(),
  getMonthRecords: async (year, monthZeroBased) =>
    getMonthRecordsFromFirestore(year, monthZeroBased),
  getForDate: async date => getForDate(date),
  getForDateWithMeta: async (date, syncFromRemote = true) =>
    getForDateWithMeta(date, syncFromRemote),
  initializeDay: async (date, copyFromDate) => initializeDayDetailed(date, copyFromDate),
  getPreviousDayWithMeta: async date => getPreviousDayWithMeta(date),
};

export const defaultDailyRecordWritePort: DailyRecordWritePort = {
  updatePartial: async (date, patch) => updatePartial(date, patch),
  save: async (record, expectedLastUpdated) => save(record, expectedLastUpdated),
  delete: async date => deleteDailyRecordAcrossStores(date),
};

export const defaultDailyRecordSyncPort: DailyRecordSyncPort = {
  syncWithFirestoreDetailed: async date => syncWithFirestoreDetailed(date),
};
