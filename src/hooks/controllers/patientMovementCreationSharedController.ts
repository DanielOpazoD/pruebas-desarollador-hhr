import { BedDefinition } from '@/types/domain/beds';
import type { DailyRecord } from '@/hooks/contracts/dailyRecordHookContracts';
import type { PatientData } from '@/hooks/contracts/patientHookContracts';
import { ControllerResult, failWithCode, ok } from '@/shared/controllerResult';
import { deepClone } from '@/utils/deepClone';

export type MovementCreationErrorCode = 'BED_NOT_FOUND' | 'SOURCE_BED_EMPTY';

export interface MovementAuditEntry {
  bedId: string;
  patientName: string;
  rut: string;
  status: 'Vivo' | 'Fallecido';
}

export const cloneMovementPatientSnapshot = (patient: PatientData): PatientData =>
  deepClone(patient);

export const resolveMovementBedDefinition = (
  bedId: string,
  bedsCatalog: readonly BedDefinition[]
): BedDefinition | undefined => bedsCatalog.find(bed => bed.id === bedId);

export const buildClearedMovementPatient = ({
  bedId,
  location,
  createEmptyPatient,
}: {
  bedId: string;
  location?: string;
  createEmptyPatient: (bedId: string) => PatientData;
}): PatientData => {
  const cleanPatient = createEmptyPatient(bedId);
  cleanPatient.location = location;
  return cleanPatient;
};

export const resolveOccupiedMovementSource = ({
  record,
  bedId,
  emptyBedMessage,
}: {
  record: DailyRecord;
  bedId: string;
  emptyBedMessage: string;
}): ControllerResult<{ patient: PatientData }, MovementCreationErrorCode> => {
  const patient = record.beds[bedId];
  if (!patient) {
    return failWithCode('BED_NOT_FOUND', `No existe la cama ${bedId} en el registro actual.`);
  }
  if (!patient.patientName) {
    return failWithCode('SOURCE_BED_EMPTY', emptyBedMessage);
  }
  return ok({ patient });
};
