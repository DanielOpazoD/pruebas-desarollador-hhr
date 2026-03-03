import { DailyRecord, PatientData } from '@/types';
import { mapPatientToFhir } from '@/services/utils/fhirMappers';
import { createDailyRecordAggregate } from '@/services/repositories/dailyRecordAggregate';

export const syncPatientFhirResource = (patient: PatientData | undefined): void => {
  if (!patient?.patientName?.trim()) {
    return;
  }

  patient.fhir_resource = mapPatientToFhir(patient);
};

export const syncDailyRecordClinicalResources = (record: DailyRecord): void => {
  createDailyRecordAggregate(record).clinical.forEachPatient(patient => {
    syncPatientFhirResource(patient);
    syncPatientFhirResource(patient.clinicalCrib);
  });
};

export const collectDailyRecordPatientsForMasterSync = (record: DailyRecord): PatientData[] => {
  const patientsToSync: PatientData[] = [];

  createDailyRecordAggregate(record).clinical.forEachPatient(patient => {
    if (patient.patientName?.trim() && patient.rut?.trim()) {
      patientsToSync.push(patient);
    }

    if (patient.clinicalCrib?.patientName?.trim() && patient.clinicalCrib.rut?.trim()) {
      patientsToSync.push(patient.clinicalCrib);
    }
  });

  return patientsToSync;
};
