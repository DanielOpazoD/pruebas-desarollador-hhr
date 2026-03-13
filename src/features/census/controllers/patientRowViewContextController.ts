import type { PatientActionMenuIndicators } from '@/features/census/components/patient-row/patientRowContracts';
import type { PatientRowViewContext } from '@/features/census/controllers/patientRowBindingSectionsController';
import { resolvePatientRowCapabilities } from '@/features/census/controllers/patientRowCapabilitiesController';
import {
  EMPTY_PATIENT_ROW_INDICATORS,
  resolvePatientRowIndicators,
} from '@/features/census/controllers/patientRowIndicatorsController';
import type { PatientData, UserRole } from '@/types';
import type { PatientRowRuntime } from '@/features/census/components/patient-row/patientRowRuntimeContracts';

interface PatientRowViewContextInput {
  role?: UserRole;
  data: PatientData;
  runtime: PatientRowRuntime;
  indicators?: PatientActionMenuIndicators;
}

export const resolvePatientRowViewContext = ({
  role,
  data,
  runtime,
  indicators,
}: PatientRowViewContextInput): PatientRowViewContext => {
  const capabilities = resolvePatientRowCapabilities({
    role,
    patient: data,
    isBlocked: runtime.rowState.isBlocked,
    isEmpty: runtime.rowState.isEmpty,
  });

  return {
    capabilities,
    indicators: resolvePatientRowIndicators({
      indicators,
      canShowClinicalDocumentIndicator: capabilities.canShowClinicalDocumentIndicator,
    }),
  };
};

export const buildPatientRowModalViewContext = ({
  role,
  data,
  runtime,
}: Pick<PatientRowViewContextInput, 'role' | 'data' | 'runtime'>): PatientRowViewContext => ({
  capabilities: resolvePatientRowViewContext({
    role,
    data,
    runtime,
    indicators: undefined as PatientActionMenuIndicators | undefined,
  }).capabilities,
  indicators: EMPTY_PATIENT_ROW_INDICATORS,
});
