import type { DailyRecord } from '@/types/core';

export interface EmptyDailyRecordMovements {
  discharges: DailyRecord['discharges'];
  transfers: DailyRecord['transfers'];
  cma: DailyRecord['cma'];
}

export const createEmptyDailyRecordMovements = (): EmptyDailyRecordMovements => ({
  discharges: [],
  transfers: [],
  cma: [],
});
