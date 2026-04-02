import { BEDS } from '@/constants/beds';
import { EVACUATION_METHOD_AEROCARDAL } from '@/constants/clinical';
import { PatientTraceability, SpecialtyTraceabilityType } from '@/types/minsalTypes';
import { normalizeSpecialty, isFachEvacuationMethod } from './normalization';
import { createEpisodeAdmissionTracker } from './episodeTracker';
import type { MinsalDailyRecord } from './minsalRecordContracts';

const resolveTraceabilityDiagnosis = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const diagnosis = value.trim();
  return diagnosis || undefined;
};

/**
 * Build traceability list lazily for a specialty + indicator type.
 */
export function buildSpecialtyTraceability(
  records: MinsalDailyRecord[],
  specialty: string,
  type: SpecialtyTraceabilityType
): PatientTraceability[] {
  if (records.length === 0) return [];

  const normalizedSpecialty = normalizeSpecialty(specialty);
  const orderedRecords = records.slice().sort((a, b) => a.date.localeCompare(b.date));
  const episodeTracker = createEpisodeAdmissionTracker();

  orderedRecords.forEach(record => {
    Object.values(record.beds || {}).forEach(bed => {
      episodeTracker.observeBed(bed, record.date);
    });
  });

  const traceability: PatientTraceability[] = [];

  orderedRecords.forEach(record => {
    const closedRuts = new Set<string>();

    if (type === 'dias-cama') {
      BEDS.forEach(bed => {
        const patient = record.beds[bed.id];
        if (!patient || patient.isBlocked) return;

        if (
          patient.patientName?.trim() &&
          normalizeSpecialty(patient.specialty) === normalizedSpecialty
        ) {
          traceability.push({
            name: patient.patientName,
            rut: patient.rut,
            diagnosis: resolveTraceabilityDiagnosis(patient.pathology),
            date: record.date,
            bedName: patient.bedName,
            admissionDate: episodeTracker.resolveAdmissionDate(patient.rut, patient.admissionDate),
          });
        }
      });
    }

    if (type === 'egresos' || type === 'fallecidos') {
      record.discharges?.forEach(discharge => {
        if (normalizeSpecialty(discharge.originalData?.specialty) !== normalizedSpecialty) return;
        if (type === 'fallecidos' && discharge.status !== 'Fallecido') return;

        const admissionDate = episodeTracker.resolveAdmissionDate(
          discharge.rut,
          discharge.originalData?.admissionDate
        );

        traceability.push({
          name: discharge.patientName,
          rut: discharge.rut,
          diagnosis: resolveTraceabilityDiagnosis(
            discharge.diagnosis || discharge.originalData?.pathology
          ),
          date: record.date,
          bedName: discharge.bedName,
          admissionDate,
          dischargeDate: record.date,
        });
        if (discharge.rut) {
          closedRuts.add(discharge.rut);
        }
      });
    }

    record.transfers?.forEach(transfer => {
      if (normalizeSpecialty(transfer.originalData?.specialty) !== normalizedSpecialty) return;
      if (type === 'aerocardal' && transfer.evacuationMethod !== EVACUATION_METHOD_AEROCARDAL)
        return;
      if (type === 'fach' && !isFachEvacuationMethod(transfer.evacuationMethod)) return;

      const admissionDate = episodeTracker.resolveAdmissionDate(
        transfer.rut,
        transfer.originalData?.admissionDate
      );

      traceability.push({
        name: transfer.patientName,
        rut: transfer.rut,
        diagnosis: resolveTraceabilityDiagnosis(
          transfer.diagnosis || transfer.originalData?.pathology
        ),
        date: record.date,
        bedName: transfer.bedName,
        admissionDate,
        dischargeDate: record.date,
      });
      if (transfer.rut) {
        closedRuts.add(transfer.rut);
      }
    });

    closedRuts.forEach(rut => episodeTracker.closeEpisode(rut));
  });

  return traceability;
}
