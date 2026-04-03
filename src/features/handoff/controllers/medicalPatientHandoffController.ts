// Deprecated controller bridge. Keep imports stable while patient-entry
// handoff logic lives in domain/application.
export {
  buildMedicalHandoffFieldsFromEntries,
  createMedicalHandoffEntry,
  formatMedicalHandoffActorLabel,
  formatMedicalHandoffTimestamp,
  getDisplayMedicalHandoffEntries,
  getMedicalHandoffSpecialtyOptions,
  getNextMedicalHandoffSpecialty,
  getPatientMedicalHandoffEntries,
} from '@/domain/handoff/patientEntries';
