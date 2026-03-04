import type { ClinicalDocumentEpisodeContext } from '@/features/clinical-documents/domain/entities';
import type { PatientData } from '@/types';
import { calculateAge } from '@/utils/clinicalUtils';

export const buildClinicalEpisodeKey = (patientRut: string, admissionDate?: string): string =>
  `${patientRut || 'sin-rut'}__${admissionDate || 'sin-ingreso'}`;

const padTime = (value: number): string => value.toString().padStart(2, '0');

export const getCurrentDateValue = (): string => new Date().toISOString().slice(0, 10);

export const getCurrentTimeValue = (): string => {
  const date = new Date();
  return `${padTime(date.getHours())}:${padTime(date.getMinutes())}`;
};

export const buildClinicalDocumentEpisodeContext = (
  patient: PatientData,
  sourceDailyRecordDate: string,
  sourceBedId: string
): ClinicalDocumentEpisodeContext => ({
  patientRut: patient.rut,
  patientName: patient.patientName,
  episodeKey: buildClinicalEpisodeKey(patient.rut, patient.admissionDate),
  admissionDate: patient.admissionDate,
  sourceDailyRecordDate,
  sourceBedId,
  specialty: patient.specialty,
});

export const buildClinicalDocumentPatientFieldValues = (
  patient: PatientData
): Record<string, string> => ({
  nombre: patient.patientName || '',
  rut: patient.rut || '',
  edad: patient.age || calculateAge(patient.birthDate),
  fecnac: patient.birthDate || '',
  fing: patient.admissionDate || '',
  finf: getCurrentDateValue(),
  hinf: getCurrentTimeValue(),
});
