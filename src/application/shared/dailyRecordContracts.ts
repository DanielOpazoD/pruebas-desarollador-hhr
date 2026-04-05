import type { DailyRecord as RootDailyRecord } from '@/types/domain/dailyRecord';
import type { DailyRecordPatch as RootDailyRecordPatch } from '@/types/domain/dailyRecordPatch';
import type {
  MedicalHandoffBySpecialty as RootMedicalHandoffBySpecialty,
  MedicalHandoffActor as RootMedicalHandoffActor,
  MedicalSpecialty as RootMedicalSpecialty,
  MedicalSpecialtyHandoffNote as RootMedicalSpecialtyHandoffNote,
} from '@/types/domain/dailyRecordMedicalHandoff';
import type {
  DailyRecordBedAuditState as RootDailyRecordBedAuditState,
  DailyRecordBedLayoutState as RootDailyRecordBedLayoutState,
  DailyRecordBedsState as RootDailyRecordBedsState,
  DailyRecordCriticalValidationState as RootDailyRecordCriticalValidationState,
  DailyRecordCudyrExportState as RootDailyRecordCudyrExportState,
  DailyRecordDateRef as RootDailyRecordDateRef,
  DailyRecordMedicalMessagingState as RootDailyRecordMedicalMessagingState,
  DailyRecordStaffingState as RootDailyRecordStaffingState,
} from '@/types/domain/dailyRecordSlices';

/**
 * Application-facing daily record contracts.
 *
 * Keep application and UI-adjacent code importing from here instead of the root
 * `types/domain/dailyRecord` contract so the persistence shape can keep
 * shrinking behind contextual contracts over time.
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
export type DailyRecordBedLayoutState = RootDailyRecordBedLayoutState;
export type DailyRecordCriticalValidationState = RootDailyRecordCriticalValidationState;
export type DailyRecordCudyrExportState = RootDailyRecordCudyrExportState;
export type DailyRecordStaffingState = RootDailyRecordStaffingState;
export type DailyRecordMedicalMessagingState = RootDailyRecordMedicalMessagingState;
