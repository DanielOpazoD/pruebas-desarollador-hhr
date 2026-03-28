import type { DailyRecord } from './dailyRecord';

export type DailyRecordDateRef = Pick<DailyRecord, 'date'>;

export type DailyRecordBedsState = Pick<DailyRecord, 'beds'>;

export type DailyRecordBedLayoutState = Pick<
  DailyRecord,
  'beds' | 'activeExtraBeds' | 'bedTypeOverrides'
>;

export type DailyRecordBedAuditState = Pick<DailyRecord, 'date' | 'beds'>;

export type DailyRecordMovementState = Pick<
  DailyRecord,
  'date' | 'beds' | 'discharges' | 'transfers'
>;

export type DailyRecordStaffingState = Pick<
  DailyRecord,
  | 'nurses'
  | 'nurseName'
  | 'nursesDayShift'
  | 'nursesNightShift'
  | 'tensDayShift'
  | 'tensNightShift'
  | 'handoffNightReceives'
>;

export type DailyRecordMedicalMessagingState = Pick<
  DailyRecord,
  'date' | 'beds' | 'medicalHandoffDoctor'
>;

export type DailyRecordCmaState = Pick<DailyRecord, 'cma'>;
