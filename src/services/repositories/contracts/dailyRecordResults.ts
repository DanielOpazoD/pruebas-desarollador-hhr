const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const assertDate = (date: string, operation: string): void => {
  if (!date || !ISO_DATE_REGEX.test(date)) {
    throw new Error(`[RepositoryContract] Invalid date format for ${operation}: "${date}"`);
  }
};

export interface SaveDailyRecordResult {
  date: string;
  savedLocally: boolean;
  savedRemotely: boolean;
  queuedForRetry: boolean;
  autoMerged: boolean;
}

export interface UpdatePartialDailyRecordResult {
  date: string;
  savedLocally: boolean;
  updatedRemotely: boolean;
  queuedForRetry: boolean;
  autoMerged: boolean;
  patchedFields: number;
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
