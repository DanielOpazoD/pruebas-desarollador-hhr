import type {
  PatientActionMenuBinding,
  PatientActionMenuIndicators,
  RowMenuAlign,
} from '@/features/census/components/patient-row/patientRowContracts';
import { EMPTY_PATIENT_ROW_INDICATORS } from '@/features/census/controllers/patientRowIndicatorsController';
import {
  resolvePatientActionMenuViewState,
  type ResolvePatientActionMenuViewParams,
} from '@/features/census/controllers/patientActionMenuViewController';

interface ResolvePatientActionMenuBindingParams extends ResolvePatientActionMenuViewParams {
  align?: RowMenuAlign;
  showCmaAction?: boolean;
  indicators?: Required<PatientActionMenuIndicators>;
}

export const resolvePatientActionMenuBinding = ({
  align = 'top',
  isBlocked,
  readOnly,
  showCmaAction = true,
  hasHistoryAction,
  hasClinicalDocumentsAction,
  hasExamRequestAction,
  hasImagingRequestAction,
  indicators,
}: ResolvePatientActionMenuBindingParams): PatientActionMenuBinding => ({
  align,
  isBlocked,
  readOnly,
  showCmaAction,
  indicators: indicators || EMPTY_PATIENT_ROW_INDICATORS,
  availability: resolvePatientActionMenuViewState({
    isBlocked,
    readOnly,
    hasHistoryAction,
    hasClinicalDocumentsAction,
    hasExamRequestAction,
    hasImagingRequestAction,
  }),
});
