// Deprecated controller bridge. Keep imports stable while patient-entry
// handoff logic lives in domain/application.
export {
  buildMedicalEntryAddFields,
  buildMedicalEntryContinuityFields,
  buildMedicalEntryDeleteFields,
  buildMedicalEntryNoteFields,
  buildMedicalEntrySpecialtyFields,
  buildMedicalPrimaryEntryCreateFields,
  buildMedicalPrimaryNoteFields,
} from '@/domain/handoff/patientEntryMutations';
