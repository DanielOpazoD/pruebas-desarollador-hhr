import type { DailyRecord, PatientData } from '@/types';
import { createDailyRecordAggregate } from '@/services/repositories/dailyRecordAggregate';

export const inheritPatientHandoffNotes = (
  targetPatient: PatientData,
  sourcePatient: PatientData | undefined
): void => {
  if (!sourcePatient) {
    return;
  }

  const prevNightNote = sourcePatient.handoffNoteNightShift || sourcePatient.handoffNote || '';
  targetPatient.handoffNoteDayShift = prevNightNote;
  targetPatient.handoffNoteNightShift = prevNightNote;
};

export const resolveInitialDayHandoff = (prevRecord: DailyRecord | null): string => {
  if (!prevRecord) {
    return '';
  }

  const previousAggregate = createDailyRecordAggregate(prevRecord);
  return previousAggregate.handoff.nightNovedades || previousAggregate.handoff.dayNovedades;
};
