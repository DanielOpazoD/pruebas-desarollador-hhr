import type { DailyRecord as RootDailyRecord } from '@/types/domain/dailyRecord';
import type { DailyRecordPatch as RootDailyRecordPatch } from '@/types/domain/dailyRecordPatch';
import type {
  MedicalHandoffActor as RootMedicalHandoffActor,
  MedicalSpecialty as RootMedicalSpecialty,
} from '@/types/domain/dailyRecordMedicalHandoff';

/**
 * Service-layer daily record contracts.
 *
 * Non-repository services should depend on this entrypoint instead of importing
 * the persistence root contract directly. That keeps service code insulated from
 * future slicing of the `DailyRecord` shape.
 */
export type DailyRecord = RootDailyRecord;
export type DailyRecordPatch = RootDailyRecordPatch;
export type MedicalHandoffActor = RootMedicalHandoffActor;
export type MedicalSpecialty = RootMedicalSpecialty;
