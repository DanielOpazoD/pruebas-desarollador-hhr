import { BEDS } from '@/constants/beds';
import { EVACUATION_METHOD_AEROCARDAL } from '@/constants/clinical';
import { PatientTraceability, SpecialtyTraceabilityType } from '@/types/minsalTypes';
import { normalizeSpecialty, isFachEvacuationMethod } from './normalization';
import type { MinsalDailyRecord } from './minsalRecordContracts';

const resolveTraceabilityDiagnosis = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const diagnosis = value.trim();
  return diagnosis || undefined;
};

const normalizeIsoDate = (value?: string): string | undefined => {
  if (!value) return undefined;
  const datePart = value.split('T')[0].trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : undefined;
};

const mergeAdmissionDatesFromRecord = (
  record: MinsalDailyRecord,
  admissionDatesByRut: Map<string, string>
): void => {
  Object.values(record.beds || {}).forEach(bed => {
    if (!bed || bed.isBlocked || !bed.patientName?.trim()) return;

    const primaryRut = bed.rut?.trim();
    const admissionDate = normalizeIsoDate(bed.admissionDate);
    if (primaryRut && admissionDate) {
      admissionDatesByRut.set(primaryRut, admissionDate);
    }

    const crib = bed.clinicalCrib;
    const cribRut = crib?.rut?.trim();
    const cribAdmissionDate = normalizeIsoDate(crib?.admissionDate);
    if (cribRut && cribAdmissionDate) {
      admissionDatesByRut.set(cribRut, cribAdmissionDate);
    }
  });
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
  const admissionDatesByRut = new Map<string, string>();
  const dischargeDates = new Map<string, string>();

  orderedRecords.forEach(record => {
    mergeAdmissionDatesFromRecord(record, admissionDatesByRut);

    record.discharges?.forEach(discharge => {
      dischargeDates.set(discharge.rut, record.date);
    });
    record.transfers?.forEach(transfer => {
      dischargeDates.set(transfer.rut, record.date);
    });
  });

  const traceability: PatientTraceability[] = [];

  orderedRecords.forEach(record => {
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
            admissionDate: patient.admissionDate,
            dischargeDate: dischargeDates.get(patient.rut),
          });
        }
      });
      return;
    }

    if (type === 'egresos' || type === 'fallecidos') {
      record.discharges?.forEach(discharge => {
        if (normalizeSpecialty(discharge.originalData?.specialty) !== normalizedSpecialty) return;
        if (type === 'fallecidos' && discharge.status !== 'Fallecido') return;

        const admissionDate =
          (discharge.rut && admissionDatesByRut.get(discharge.rut.trim())) ||
          normalizeIsoDate(discharge.originalData?.admissionDate);

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
      });
      return;
    }

    record.transfers?.forEach(transfer => {
      if (normalizeSpecialty(transfer.originalData?.specialty) !== normalizedSpecialty) return;
      if (type === 'aerocardal' && transfer.evacuationMethod !== EVACUATION_METHOD_AEROCARDAL)
        return;
      if (type === 'fach' && !isFachEvacuationMethod(transfer.evacuationMethod)) return;

      const admissionDate =
        (transfer.rut && admissionDatesByRut.get(transfer.rut.trim())) ||
        normalizeIsoDate(transfer.originalData?.admissionDate);

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
    });
  });

  return traceability;
}
