import type { DailyRecord as ApplicationDailyRecord } from '@/application/shared/dailyRecordContracts';

/**
 * Public medical signature flows only need the application-facing record shape.
 * Avoid coupling admin orchestration to the persistence root contract.
 */
export type DailyRecord = ApplicationDailyRecord;
