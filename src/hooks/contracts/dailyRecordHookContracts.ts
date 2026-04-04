import type { DailyRecord as RootDailyRecord } from '@/types/domain/dailyRecord';
import type { DailyRecordPatch as RootDailyRecordPatch } from '@/types/domain/dailyRecordPatch';
import type {
  MedicalHandoffActor as RootMedicalHandoffActor,
  MedicalHandoffBySpecialty as RootMedicalHandoffBySpecialty,
  MedicalSpecialty as RootMedicalSpecialty,
  MedicalSpecialtyHandoffNote as RootMedicalSpecialtyHandoffNote,
} from '@/types/domain/dailyRecordMedicalHandoff';
import type {
  DailyRecordBedAuditState as RootDailyRecordBedAuditState,
  DailyRecordBedsState as RootDailyRecordBedsState,
  DailyRecordDateRef as RootDailyRecordDateRef,
  DailyRecordMedicalMessagingState as RootDailyRecordMedicalMessagingState,
  DailyRecordStaffingState as RootDailyRecordStaffingState,
} from '@/types/domain/dailyRecordSlices';

/**
 * Hook/runtime-facing daily record contracts.
 *
 * Hooks should prefer this file over the root persistence contract so the UI
 * layer does not keep widening the direct dependency surface of `DailyRecord`.
 */
export type DailyRecord = RootDailyRecord;
export type DailyRecordPatch = RootDailyRecordPatch;
export type MedicalHandoffActor = RootMedicalHandoffActor;
export type MedicalSpecialty = RootMedicalSpecialty;
export type MedicalHandoffBySpecialty = RootMedicalHandoffBySpecialty;
export type MedicalSpecialtyHandoffNote = RootMedicalSpecialtyHandoffNote;
export type DailyRecordDateRef = RootDailyRecordDateRef;
export type DailyRecordBedsState = RootDailyRecordBedsState;
export type DailyRecordBedAuditState = RootDailyRecordBedAuditState;
export type DailyRecordStaffingState = RootDailyRecordStaffingState;
export type DailyRecordMedicalMessagingState = RootDailyRecordMedicalMessagingState;
