import type { DailyRecord as RootDailyRecord } from '@/types/domain/dailyRecord';
import type { DailyRecordPatch as RootDailyRecordPatch } from '@/types/domain/dailyRecordPatch';
import type {
  MedicalHandoffActor as RootMedicalHandoffActor,
  MedicalSpecialty as RootMedicalSpecialty,
} from '@/types/domain/dailyRecordMedicalHandoff';

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
