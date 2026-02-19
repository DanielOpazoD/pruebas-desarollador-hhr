import { DailyRecord, DailyRecordPatch } from '@/types';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface SaveDailyRecordCommand {
  date: string;
  record: DailyRecord;
  expectedLastUpdated?: string;
}

export interface PartialUpdateDailyRecordCommand {
  date: string;
  patch: DailyRecordPatch;
}

const assertDate = (date: string, operation: string): void => {
  if (!date || !ISO_DATE_REGEX.test(date)) {
    throw new Error(`[RepositoryContract] Invalid date format for ${operation}: "${date}"`);
  }
};

export const createSaveDailyRecordCommand = (
  record: DailyRecord,
  expectedLastUpdated?: string
): SaveDailyRecordCommand => {
  assertDate(record.date, 'save');
  return {
    date: record.date,
    record,
    expectedLastUpdated,
  };
};

export const createPartialUpdateDailyRecordCommand = (
  date: string,
  patch: DailyRecordPatch
): PartialUpdateDailyRecordCommand => {
  assertDate(date, 'updatePartial');
  if (!patch || typeof patch !== 'object' || Object.keys(patch).length === 0) {
    throw new Error('[RepositoryContract] updatePartial requires at least one patch field');
  }
  return {
    date,
    patch,
  };
};
