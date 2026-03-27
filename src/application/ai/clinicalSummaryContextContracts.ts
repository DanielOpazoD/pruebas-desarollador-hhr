export interface ClinicalAISummaryPatientContract {
  patientName?: string;
  rut?: string;
  age?: string;
  admissionDate?: string;
  admissionTime?: string;
  specialty?: string;
  secondarySpecialty?: string;
  status?: string;
  pathology?: string;
  diagnosisComments?: string;
  cie10Code?: string;
  cie10Description?: string;
  devices?: string[];
  clinicalEvents?: unknown[];
  medicalHandoffNote?: string;
  medicalHandoffEntries?: unknown[];
  handoffNoteDayShift?: string;
  handoffNoteNightShift?: string;
}

export interface ClinicalAISummaryRecordContract {
  date: string;
  beds: Record<string, ClinicalAISummaryPatientContract | undefined>;
  nursesDayShift?: string[];
  nursesNightShift?: string[];
  tensDayShift?: string[];
  tensNightShift?: string[];
  handoffNovedadesDayShift?: string;
  handoffNovedadesNightShift?: string;
  handoffDayChecklist?: Record<string, boolean | undefined>;
  handoffNightChecklist?: Record<string, boolean | string | undefined>;
  medicalHandoffNovedades?: string;
  medicalHandoffBySpecialty?: Record<string, unknown>;
  medicalHandoffDoctor?: string;
  medicalSignature?: {
    doctorName: string;
    signedAt: string;
    userAgent?: string;
  };
}
