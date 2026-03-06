import type {
  PatientActionMenuBinding,
  PatientActionMenuIndicators,
  RowMenuAlign,
} from '@/features/census/components/patient-row/patientRowContracts';
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
  indicators: indicators || {
    hasClinicalDocument: false,
    isNewAdmission: false,
  },
  availability: resolvePatientActionMenuViewState({
    isBlocked,
    readOnly,
    hasHistoryAction,
    hasClinicalDocumentsAction,
    hasExamRequestAction,
    hasImagingRequestAction,
  }),
});
