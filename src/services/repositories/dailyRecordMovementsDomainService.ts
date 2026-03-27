import type { DailyRecord } from '@/services/contracts/dailyRecordServiceContracts';

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
