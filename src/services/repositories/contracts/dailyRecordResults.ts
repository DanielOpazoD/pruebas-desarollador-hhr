import type { DailyRecord } from '@/types/core';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const assertDate = (date: string, operation: string): void => {
  if (!date || !ISO_DATE_REGEX.test(date)) {
    throw new Error(`[RepositoryContract] Invalid date format for ${operation}: "${date}"`);
  }
};

export interface SaveDailyRecordResult {
  date: string;
  outcome: 'clean' | 'queued' | 'auto_merged';
  savedLocally: boolean;
  savedRemotely: boolean;
  queuedForRetry: boolean;
  autoMerged: boolean;
}

export interface UpdatePartialDailyRecordResult {
  date: string;
  outcome: 'clean' | 'queued' | 'auto_merged' | 'blocked';
  savedLocally: boolean;
  updatedRemotely: boolean;
  queuedForRetry: boolean;
  autoMerged: boolean;
  patchedFields: number;
}

export interface SyncDailyRecordResult {
  date: string;
  outcome: 'clean' | 'missing' | 'blocked';
  record: DailyRecord | null;
}

export interface InitializeDayResult {
  date: string;
  outcome: 'clean' | 'repaired';
  sourceDate?: string;
}

export interface CopyPatientResult {
  sourceDate: string;
  targetDate: string;
  outcome: 'clean' | 'repaired';
}

export const createSaveDailyRecordResult = (
  input: SaveDailyRecordResult
): SaveDailyRecordResult => {
  assertDate(input.date, 'save result');
  return input;
};

export const createUpdatePartialDailyRecordResult = (
  input: UpdatePartialDailyRecordResult
): UpdatePartialDailyRecordResult => {
  assertDate(input.date, 'updatePartial result');
  if (!Number.isFinite(input.patchedFields) || input.patchedFields < 1) {
    throw new Error(
      `[RepositoryContract] updatePartial result requires patchedFields >= 1. Received: ${input.patchedFields}`
    );
  }
  return input;
};

export const createSyncDailyRecordResult = (
  input: SyncDailyRecordResult
): SyncDailyRecordResult => {
  assertDate(input.date, 'sync result');
  return input;
};

export const createInitializeDayResult = (input: InitializeDayResult): InitializeDayResult => {
  assertDate(input.date, 'initializeDay result');
  return input;
};

export const createCopyPatientResult = (input: CopyPatientResult): CopyPatientResult => {
  assertDate(input.sourceDate, 'copyPatient source result');
  assertDate(input.targetDate, 'copyPatient target result');
  return input;
};
