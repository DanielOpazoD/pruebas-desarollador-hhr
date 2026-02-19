import { DailyRecord } from '@/types';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface GetDailyRecordQuery {
  date: string;
  syncFromRemote: boolean;
}

export interface GetPreviousDayQuery {
  date: string;
}

export type DailyRecordReadSource =
  | 'e2e'
  | 'demo'
  | 'indexeddb'
  | 'firestore'
  | 'legacy'
  | 'not_found';

export interface DailyRecordReadResult {
  date: string;
  record: DailyRecord | null;
  source: DailyRecordReadSource;
}

const assertDate = (date: string, operation: string): void => {
  if (!ISO_DATE_REGEX.test(date || '')) {
    throw new Error(`[RepositoryContract] Invalid date format for ${operation}: "${date}"`);
  }
};

export const createGetDailyRecordQuery = (
  date: string,
  syncFromRemote: boolean = true
): GetDailyRecordQuery => {
  assertDate(date, 'getForDate');
  return {
    date,
    syncFromRemote,
  };
};

export const createGetPreviousDayQuery = (date: string): GetPreviousDayQuery => {
  assertDate(date, 'getPreviousDay');
  return { date };
};

export const createDailyRecordReadResult = (
  date: string,
  record: DailyRecord | null,
  source: DailyRecordReadSource
): DailyRecordReadResult => {
  assertDate(date, 'createDailyRecordReadResult');
  if (record && record.date !== date) {
    throw new Error(
      `[RepositoryContract] Read result date mismatch. Expected ${date} but received ${record.date}`
    );
  }

  return {
    date,
    record,
    source,
  };
};
