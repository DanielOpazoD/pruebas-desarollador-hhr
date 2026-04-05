import { BedDefinition } from '@/types/domain/beds';
import type { PatientData } from '@/hooks/contracts/patientHookContracts';
import { TransferData } from '@/types/domain/movements';
import type { TransferCommandPayload } from '@/types/movements';
import {
  buildClearedMovementPatient,
  cloneMovementPatientSnapshot,
} from '@/hooks/controllers/patientMovementCreationSharedController';

interface BuildTransferEntriesParams {
  patient: PatientData;
  bedId: string;
  bedDef?: BedDefinition;
  payload: TransferCommandPayload;
  resolvedMovementDate: string;
  createId: () => string;
}

export const buildTransferEntries = ({
  patient,
  bedId,
  bedDef,
  payload,
  resolvedMovementDate,
  createId,
}: BuildTransferEntriesParams): TransferData[] => {
  const {
    evacuationMethod: method,
    receivingCenter: center,
    receivingCenterOther: centerOther,
    transferEscort: escort,
    time,
  } = payload;

  const transfers: TransferData[] = [
    {
      id: createId(),
      movementDate: resolvedMovementDate,
      admissionDate: patient.admissionDate,
      bedName: bedDef?.name || bedId,
      bedId,
      bedType: bedDef?.type || '',
      patientName: patient.patientName,
      rut: patient.rut,
      diagnosis: patient.pathology,
      specialty: patient.specialty,
      time: time || '',
      evacuationMethod: method,
      receivingCenter: center,
      receivingCenterOther: centerOther,
      transferEscort: escort,
      age: patient.age,
      insurance: patient.insurance,
      origin: patient.origin,
      isRapanui: patient.isRapanui,
      originalData: cloneMovementPatientSnapshot(patient),
      isNested: false,
    },
  ];

  if (patient.clinicalCrib?.patientName) {
    transfers.push({
      id: createId(),
      movementDate: resolvedMovementDate,
      admissionDate: patient.clinicalCrib.admissionDate,
      bedName: `${bedDef?.name || bedId} (Cuna)`,
      bedId,
      bedType: 'Cuna',
      patientName: patient.clinicalCrib.patientName,
      rut: patient.clinicalCrib.rut,
      diagnosis: patient.clinicalCrib.pathology,
      specialty: patient.clinicalCrib.specialty,
      time: time || '',
      evacuationMethod: method,
      receivingCenter: center,
      receivingCenterOther: centerOther,
      transferEscort: escort,
      age: patient.clinicalCrib.age,
      insurance: patient.insurance,
      origin: patient.origin,
      isRapanui: patient.isRapanui,
      originalData: cloneMovementPatientSnapshot(patient.clinicalCrib),
      isNested: true,
    });
  }

  return transfers;
};

export const resolveTransferUpdatedBed = ({
  bedId,
  patient,
  createEmptyPatient,
}: {
  bedId: string;
  patient: PatientData;
  createEmptyPatient: (bedId: string) => PatientData;
}): PatientData =>
  buildClearedMovementPatient({
    bedId,
    location: patient.location,
    createEmptyPatient,
  });
