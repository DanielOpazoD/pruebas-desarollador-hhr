import type { DailyRecordPatch } from '@/application/shared/dailyRecordContracts';
import type {
  DailyRecordReadPort,
  DailyRecordWritePort,
} from '@/application/ports/dailyRecordPort';
import type { AuditPort } from '@/application/ports/auditPort';
import type {
  PatientAnalysisPatientContract,
  PatientAnalysisRecordContract,
} from '@/application/patient-flow/patientAnalysisContracts';
import type { MasterPatient } from '@/types/domain/patientMaster';
import { formatRut, isValidRut } from '@/utils/rutUtils';

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

export type PatientAnalysisDailyRecordRepository = Pick<DailyRecordReadPort, 'getAvailableDates'> &
  Pick<DailyRecordWritePort, 'updatePartial'> & {
    getForDate: (date: string) => Promise<PatientAnalysisRecordContract | null>;
  };

type PatientAnalysisOccupiedBedEntry = [
  string,
  PatientAnalysisPatientContract & {
    rut: string;
    patientName: string;
  },
];

type PatientAnalysisPresentPatient = PatientAnalysisOccupiedBedEntry[1];

interface ActivePatientEvent {
  startDate: string;
  lastSeen: string;
  bedId: string;
  diagnosis: string;
}

interface AnalysisAccumulator {
  patientsMap: Map<string, MasterPatient>;
  conflicts: Conflict[];
  activeEvents: Map<string, ActivePatientEvent>;
}

interface HarmonizeConflictHistoryInput {
  conflict: Conflict;
  dailyRecordRepository: PatientAnalysisDailyRecordRepository;
  auditPort: Pick<AuditPort, 'writeEvent'>;
  currentUserEmail: string;
  rut: string;
  correctName: string;
}

const normalizeAnalysisRut = (rut: string): string => formatRut(rut).toUpperCase();

const isPatientAnalysisOccupiedBedEntry = (
  entry: [string, PatientAnalysisPatientContract | undefined]
): entry is PatientAnalysisOccupiedBedEntry => {
  const patient = entry[1];
  return Boolean(patient?.rut && isValidRut(patient.rut) && patient.patientName?.trim());
};

const createAnalysisAccumulator = (): AnalysisAccumulator => ({
  patientsMap: new Map<string, MasterPatient>(),
  conflicts: [],
  activeEvents: new Map<string, ActivePatientEvent>(),
});

const ensureMasterPatient = (
  accumulator: AnalysisAccumulator,
  normalizedRut: string,
  patient: PatientAnalysisPresentPatient,
  date: string,
  now: number
): MasterPatient => {
  const existing = accumulator.patientsMap.get(normalizedRut);
  if (existing) {
    return existing;
  }

  const created: MasterPatient = {
    rut: normalizedRut,
    fullName: patient.patientName,
    birthDate: patient.birthDate,
    forecast: patient.insurance,
    gender: patient.biologicalSex,
    hospitalizations: [],
    vitalStatus: 'Vivo',
    lastAdmission: patient.admissionDate || date,
    createdAt: now,
    updatedAt: now,
  };
  accumulator.patientsMap.set(normalizedRut, created);
  return created;
};

const registerNameConflict = (
  conflicts: Conflict[],
  normalizedRut: string,
  currentName: string,
  nextName: string,
  date: string,
  bedId: string
) => {
  if (currentName.trim().toLowerCase() === nextName.trim().toLowerCase()) {
    return;
  }

  const existingConflict = conflicts.find(conflict => conflict.rut === normalizedRut);
  if (!existingConflict) {
    conflicts.push({
      rut: normalizedRut,
      description: 'Diferencia de nombres detectada',
      options: Array.from(new Set([currentName, nextName])),
      records: [date],
      bedMap: { [date]: bedId },
    });
    return;
  }

  if (!existingConflict.records.includes(date)) {
    existingConflict.records.push(date);
  }
  if (!existingConflict.options.includes(nextName)) {
    existingConflict.options.push(nextName);
  }
  existingConflict.bedMap[date] = bedId;
};

const registerAdmissionPresence = ({
  accumulator,
  date,
  bedId,
  patient,
  now,
}: {
  accumulator: AnalysisAccumulator;
  date: string;
  bedId: string;
  patient: PatientAnalysisPresentPatient;
  now: number;
}) => {
  const normalizedRut = normalizeAnalysisRut(patient.rut);
  const master = ensureMasterPatient(accumulator, normalizedRut, patient, date, now);

  registerNameConflict(
    accumulator.conflicts,
    normalizedRut,
    master.fullName,
    patient.patientName,
    date,
    bedId
  );

  const active = accumulator.activeEvents.get(normalizedRut);
  if (!active) {
    accumulator.activeEvents.set(normalizedRut, {
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
    return normalizedRut;
  }

  active.lastSeen = date;
  return normalizedRut;
};

const registerDischargeEvent = (
  accumulator: AnalysisAccumulator,
  date: string,
  discharge: NonNullable<PatientAnalysisRecordContract['discharges']>[number]
) => {
  if (!discharge.rut || !isValidRut(discharge.rut)) {
    return;
  }

  const normalizedRut = normalizeAnalysisRut(discharge.rut);
  const master = accumulator.patientsMap.get(normalizedRut);
  if (!master) {
    return;
  }

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

  accumulator.activeEvents.delete(normalizedRut);
};

const registerTransferEvent = (
  accumulator: AnalysisAccumulator,
  date: string,
  transfer: NonNullable<PatientAnalysisRecordContract['transfers']>[number]
) => {
  if (!transfer.rut || !isValidRut(transfer.rut)) {
    return;
  }

  const normalizedRut = normalizeAnalysisRut(transfer.rut);
  const master = accumulator.patientsMap.get(normalizedRut);
  if (!master) {
    return;
  }

  master.hospitalizations?.push({
    id: `${date}-traslado`,
    type: 'Traslado',
    date,
    diagnosis: transfer.diagnosis || 'S/D',
    bedName: transfer.bedName,
    receivingCenter: transfer.receivingCenter,
  });
  accumulator.activeEvents.delete(normalizedRut);
};

const closePatientsMissingFromCensus = (
  accumulator: AnalysisAccumulator,
  rutsInCensusToday: Set<string>
) => {
  for (const [rut, active] of Array.from(accumulator.activeEvents.entries())) {
    if (rutsInCensusToday.has(rut)) {
      continue;
    }

    const master = accumulator.patientsMap.get(rut);
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

    accumulator.activeEvents.delete(rut);
  }
};

export const buildPatientAnalysis = async (
  dailyRecordRepository: Pick<
    PatientAnalysisDailyRecordRepository,
    'getAvailableDates' | 'getForDate'
  >,
  now: () => number = Date.now
): Promise<AnalysisResult> => {
  const dates = await dailyRecordRepository.getAvailableDates();
  const sortedDates = [...dates].sort();
  const accumulator = createAnalysisAccumulator();

  for (const date of sortedDates) {
    const record = await dailyRecordRepository.getForDate(date);
    if (!record) {
      continue;
    }

    const bedsWithPatients = Object.entries(record.beds || {}).filter(
      isPatientAnalysisOccupiedBedEntry
    );
    const rutsInCensusToday = new Set<string>();

    for (const [bedId, patient] of bedsWithPatients) {
      const normalizedRut = registerAdmissionPresence({
        accumulator,
        date,
        bedId,
        patient,
        now: now(),
      });
      rutsInCensusToday.add(normalizedRut);
    }

    for (const discharge of record.discharges || []) {
      registerDischargeEvent(accumulator, date, discharge);
    }

    for (const transfer of record.transfers || []) {
      registerTransferEvent(accumulator, date, transfer);
    }

    closePatientsMissingFromCensus(accumulator, rutsInCensusToday);
  }

  return {
    totalRecords: dates.length,
    uniquePatients: accumulator.patientsMap.size,
    validPatients: Array.from(accumulator.patientsMap.values()),
    conflicts: accumulator.conflicts,
  };
};

export const harmonizePatientConflictHistory = async ({
  conflict,
  dailyRecordRepository,
  auditPort,
  currentUserEmail,
  rut,
  correctName,
}: HarmonizeConflictHistoryInput): Promise<void> => {
  for (const date of conflict.records) {
    const bedId = conflict.bedMap[date];
    if (!bedId) {
      continue;
    }

    await dailyRecordRepository.updatePartial(date, {
      [`beds.${bedId}.patientName`]: correctName,
    } as DailyRecordPatch);

    await auditPort.writeEvent(
      currentUserEmail,
      'PATIENT_HARMONIZED',
      'dailyRecord',
      date,
      {
        rut,
        correctName,
        previousName: conflict.options.filter(option => option !== correctName).join(', '),
        bedId,
        automated: true,
      },
      rut,
      date
    );
  }
};

export const resolveUpdatedAnalysisAfterConflict = ({
  analysis,
  rut,
  correctName,
  now = Date.now,
}: {
  analysis: AnalysisResult;
  rut: string;
  correctName: string;
  now?: () => number;
}): AnalysisResult => ({
  ...analysis,
  validPatients: analysis.validPatients.map(patient =>
    patient.rut === rut ? { ...patient, fullName: correctName, updatedAt: now() } : patient
  ),
  conflicts: analysis.conflicts.filter(conflict => conflict.rut !== rut),
});
