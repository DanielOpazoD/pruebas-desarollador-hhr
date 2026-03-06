import type { DailyRecordPatch, MasterPatient } from '@/types';
import { formatRut, isValidRut } from '@/utils/rutUtils';
import {
  createApplicationFailed,
  createApplicationSuccess,
  type ApplicationOutcome,
} from '@/application/shared/applicationOutcome';

export interface Conflict {
  rut: string;
  description: string;
  options: string[];
  records: string[];
  bedMap: Record<string, string>;
}

export interface AnalysisResult {
  totalRecords: number;
  uniquePatients: number;
  validPatients: MasterPatient[];
  conflicts: Conflict[];
}

interface DailyRecordRepositoryPort {
  getAllDates: () => Promise<string[]>;
  getForDate: (date: string) => Promise<{
    date: string;
    beds: Record<string, any>;
    discharges?: any[];
    transfers?: any[];
  } | null>;
  updatePartial: (date: string, patch: DailyRecordPatch) => Promise<void>;
}

interface PatientMasterRepositoryPort {
  bulkUpsertPatients: (patients: MasterPatient[]) => Promise<{
    successes: number;
    errors: number;
  }>;
}

interface AnalyzePatientsInput {
  dailyRecordRepository: DailyRecordRepositoryPort;
}

interface ResolvePatientConflictInput {
  analysis: AnalysisResult | null;
  rut: string;
  correctName: string;
  harmonizeHistory: boolean;
  dailyRecordRepository: DailyRecordRepositoryPort;
  logAuditEvent: (
    userEmail: string,
    eventType: string,
    entityType: string,
    entityId: string,
    changes?: Record<string, unknown>,
    patientRut?: string,
    dateKey?: string
  ) => Promise<void>;
  currentUserEmail: string;
}

interface MigratePatientsInput {
  analysis: AnalysisResult | null;
  patientMasterRepository: PatientMasterRepositoryPort;
}

const buildAnalysis = async (
  dailyRecordRepository: DailyRecordRepositoryPort
): Promise<AnalysisResult> => {
  const dates = await dailyRecordRepository.getAllDates();
  const sortedDates = [...dates].sort();
  const patientsMap = new Map<string, MasterPatient>();
  const conflicts: Conflict[] = [];
  const activeEvents = new Map<
    string,
    {
      startDate: string;
      lastSeen: string;
      bedId: string;
      diagnosis: string;
    }
  >();

  for (const date of sortedDates) {
    const record = await dailyRecordRepository.getForDate(date);
    if (!record) continue;

    const bedsWithPatients = Object.entries(record.beds || {}).filter(
      ([, patient]) => patient?.rut && isValidRut(patient.rut) && patient?.patientName
    );
    const rutsInCensusToday = new Set<string>();

    for (const [bedId, patient] of bedsWithPatients) {
      const normalizedRut = formatRut(patient.rut).toUpperCase();
      rutsInCensusToday.add(normalizedRut);

      let master = patientsMap.get(normalizedRut);
      if (!master) {
        master = {
          rut: normalizedRut,
          fullName: patient.patientName,
          birthDate: patient.birthDate,
          forecast: patient.insurance,
          gender: patient.biologicalSex,
          hospitalizations: [],
          vitalStatus: 'Vivo',
          lastAdmission: patient.admissionDate || date,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        patientsMap.set(normalizedRut, master);
      }

      if (master.fullName.trim().toLowerCase() !== patient.patientName.trim().toLowerCase()) {
        const existingConflict = conflicts.find(conflict => conflict.rut === normalizedRut);
        if (!existingConflict) {
          conflicts.push({
            rut: normalizedRut,
            description: 'Diferencia de nombres detectada',
            options: Array.from(new Set([master.fullName, patient.patientName])),
            records: [date],
            bedMap: { [date]: bedId },
          });
        } else {
          if (!existingConflict.records.includes(date)) {
            existingConflict.records.push(date);
          }
          if (!existingConflict.options.includes(patient.patientName)) {
            existingConflict.options.push(patient.patientName);
          }
          existingConflict.bedMap[date] = bedId;
        }
      }

      const active = activeEvents.get(normalizedRut);
      if (!active) {
        activeEvents.set(normalizedRut, {
          startDate: patient.admissionDate || date,
          lastSeen: date,
          bedId,
          diagnosis: patient.pathology || 'Ingreso detected by presence',
        });

        master.hospitalizations?.push({
          id: `${date}-ingreso-auto`,
          type: 'Ingreso',
          date: patient.admissionDate || date,
          diagnosis: patient.pathology || 'Ingreso detectado',
          bedName: bedId,
        });
        master.lastAdmission = patient.admissionDate || date;
      } else {
        active.lastSeen = date;
      }
    }

    for (const discharge of record.discharges || []) {
      if (!discharge.rut || !isValidRut(discharge.rut)) continue;
      const normalizedRut = formatRut(discharge.rut).toUpperCase();
      const master = patientsMap.get(normalizedRut);
      if (master) {
        master.hospitalizations?.push({
          id: `${date}-egreso`,
          type: 'Egreso',
          date,
          diagnosis: discharge.diagnosis || 'S/D',
          bedName: discharge.bedName,
        });
        master.lastDischarge = date;
        if (discharge.status === 'Fallecido') {
          master.vitalStatus = 'Fallecido';
          master.hospitalizations?.push({
            id: `${date}-defuncion`,
            type: 'Fallecimiento',
            date,
            diagnosis: discharge.diagnosis,
          });
        }
        activeEvents.delete(normalizedRut);
      }
    }

    for (const transfer of record.transfers || []) {
      if (!transfer.rut || !isValidRut(transfer.rut)) continue;
      const normalizedRut = formatRut(transfer.rut).toUpperCase();
      const master = patientsMap.get(normalizedRut);
      if (master) {
        master.hospitalizations?.push({
          id: `${date}-traslado`,
          type: 'Traslado',
          date,
          diagnosis: transfer.diagnosis || 'S/D',
          bedName: transfer.bedName,
          receivingCenter: transfer.receivingCenter,
        });
        activeEvents.delete(normalizedRut);
      }
    }

    for (const [rut, active] of Array.from(activeEvents.entries())) {
      if (!rutsInCensusToday.has(rut)) {
        const master = patientsMap.get(rut);
        if (master) {
          master.hospitalizations?.push({
            id: `${active.lastSeen}-egreso-auto`,
            type: 'Egreso',
            date: active.lastSeen,
            diagnosis: active.diagnosis || 'Salida automática (no detectado en censo)',
            bedName: active.bedId,
          });
          master.lastDischarge = active.lastSeen;
        }
        activeEvents.delete(rut);
      }
    }
  }

  return {
    totalRecords: dates.length,
    uniquePatients: patientsMap.size,
    validPatients: Array.from(patientsMap.values()),
    conflicts,
  };
};

export const executeAnalyzePatients = async (
  input: AnalyzePatientsInput
): Promise<ApplicationOutcome<AnalysisResult | null>> => {
  try {
    const analysis = await buildAnalysis(input.dailyRecordRepository);
    return createApplicationSuccess(analysis);
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'No se pudo analizar pacientes.',
      },
    ]);
  }
};

export const executeResolvePatientConflict = async (
  input: ResolvePatientConflictInput
): Promise<ApplicationOutcome<AnalysisResult | null>> => {
  if (!input.analysis) {
    return createApplicationSuccess(null);
  }

  const conflict = input.analysis.conflicts.find(item => item.rut === input.rut);
  if (!conflict) {
    return createApplicationSuccess(input.analysis);
  }

  if (input.harmonizeHistory) {
    for (const date of conflict.records) {
      const bedId = conflict.bedMap[date];
      if (!bedId) continue;

      await input.dailyRecordRepository.updatePartial(date, {
        [`beds.${bedId}.patientName`]: input.correctName,
      } as DailyRecordPatch);

      await input.logAuditEvent(
        input.currentUserEmail,
        'PATIENT_HARMONIZED',
        'dailyRecord',
        date,
        {
          rut: input.rut,
          correctName: input.correctName,
          previousName: conflict.options.filter(option => option !== input.correctName).join(', '),
          bedId,
          automated: true,
        },
        input.rut,
        date
      );
    }
  }

  const updatedPatients = input.analysis.validPatients.map(patient =>
    patient.rut === input.rut
      ? { ...patient, fullName: input.correctName, updatedAt: Date.now() }
      : patient
  );
  const updatedConflicts = input.analysis.conflicts.filter(item => item.rut !== input.rut);

  return createApplicationSuccess({
    ...input.analysis,
    validPatients: updatedPatients,
    conflicts: updatedConflicts,
  });
};

export const executeMigratePatients = async (
  input: MigratePatientsInput
): Promise<
  ApplicationOutcome<{
    successes: number;
    errors: number;
  } | null>
> => {
  if (!input.analysis || input.analysis.validPatients.length === 0) {
    return createApplicationSuccess(null);
  }

  try {
    const result = await input.patientMasterRepository.bulkUpsertPatients(
      input.analysis.validPatients
    );
    return createApplicationSuccess(result);
  } catch (error) {
    return createApplicationFailed(null, [
      {
        kind: 'unknown',
        message: error instanceof Error ? error.message : 'No se pudo migrar la base de pacientes.',
      },
    ]);
  }
};
