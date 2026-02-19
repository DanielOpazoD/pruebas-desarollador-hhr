const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export interface InitializeDayCommand {
  date: string;
  copyFromDate?: string;
}

export interface DeleteDayCommand {
  date: string;
}

export interface CopyPatientToDateCommand {
  sourceDate: string;
  sourceBedId: string;
  targetDate: string;
  targetBedId: string;
}

const assertDate = (date: string, operation: string): void => {
  if (!date || !ISO_DATE_REGEX.test(date)) {
    throw new Error(`[RepositoryContract] Invalid date format for ${operation}: "${date}"`);
  }
};

const assertBedId = (bedId: string, field: string): void => {
  if (!bedId || typeof bedId !== 'string' || !bedId.trim()) {
    throw new Error(`[RepositoryContract] Invalid ${field}. A non-empty bed id is required`);
  }
};

export const createInitializeDayCommand = (
  date: string,
  copyFromDate?: string
): InitializeDayCommand => {
  assertDate(date, 'initializeDay');
  if (copyFromDate !== undefined) {
    assertDate(copyFromDate, 'initializeDay.copyFromDate');
  }

  return {
    date,
    copyFromDate,
  };
};

export const createDeleteDayCommand = (date: string): DeleteDayCommand => {
  assertDate(date, 'deleteDay');
  return { date };
};

export const createCopyPatientToDateCommand = (
  sourceDate: string,
  sourceBedId: string,
  targetDate: string,
  targetBedId: string
): CopyPatientToDateCommand => {
  assertDate(sourceDate, 'copyPatientToDate.sourceDate');
  assertDate(targetDate, 'copyPatientToDate.targetDate');
  assertBedId(sourceBedId, 'sourceBedId');
  assertBedId(targetBedId, 'targetBedId');

  return {
    sourceDate,
    sourceBedId,
    targetDate,
    targetBedId,
  };
};
