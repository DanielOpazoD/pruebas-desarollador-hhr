const ROOT_LOCAL_PRIORITY_FIELDS = new Set([
  'handoffNovedadesDayShift',
  'handoffNovedadesNightShift',
  'medicalHandoffGlobalNote',
]);

const ROOT_REMOTE_PRIORITY_FIELDS = new Set(['dateTimestamp', 'schemaVersion']);

const CLINICAL_PATIENT_FIELDS = new Set([
  'patientName',
  'rut',
  'documentType',
  'age',
  'birthDate',
  'biologicalSex',
  'insurance',
  'pathology',
  'snomedCode',
  'cie10Code',
  'cie10Description',
  'diagnosisComments',
  'specialty',
  'secondarySpecialty',
  'status',
  'medicalHandoffNote',
  'handoffNote',
  'handoffNoteDayShift',
  'handoffNoteNightShift',
  'clinicalCrib',
  'deliveryRoute',
  'deliveryDate',
]);

const ADMIN_PATIENT_FIELDS = new Set([
  'bedId',
  'bedName',
  'isBlocked',
  'blockedReason',
  'bedMode',
  'hasCompanionCrib',
  'location',
  'admissionDate',
  'admissionTime',
  'admissionOrigin',
  'admissionOriginDetails',
  'origin',
]);

export const RECORD_STRUCTURAL_FIELDS = new Set([
  'date',
  'beds',
  'discharges',
  'transfers',
  'cma',
  'nurses',
  'nursesDayShift',
  'nursesNightShift',
  'tensDayShift',
  'tensNightShift',
  'activeExtraBeds',
  'handoffDayChecklist',
  'handoffNightChecklist',
  'medicalSignature',
  'lastUpdated',
]);

export const selectScalarByPolicy = (
  path: string,
  remote: unknown,
  local: unknown,
  preferLocalDefault: boolean
): unknown => {
  if (local === undefined) return remote;
  if (remote === undefined) return local;

  if (ROOT_LOCAL_PRIORITY_FIELDS.has(path)) return local;
  if (ROOT_REMOTE_PRIORITY_FIELDS.has(path)) return remote;

  const parts = path.split('.');
  if (parts[0] === 'beds' && parts.length >= 3) {
    const patientField = parts[2];
    if (CLINICAL_PATIENT_FIELDS.has(patientField)) return local;
    if (ADMIN_PATIENT_FIELDS.has(patientField)) return remote;
  }

  return preferLocalDefault ? local : remote;
};
