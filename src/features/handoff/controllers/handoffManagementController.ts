// Deprecated controller bridge. Keep imports stable while the handoff module
// migrates toward domain + application entrypoints.
export {
  buildChecklistUpdateRecord,
  buildMedicalNoChangesRecord,
  buildMedicalSentPatch,
  buildMedicalSignatureRecord,
  buildMedicalSpecialtyNoteRecord,
  buildNovedadesUpdateRecord,
  buildResetMedicalHandoffRecord,
  normalizeMedicalHandoffActor,
} from '@/domain/handoff/management';
