import {
  getVisibleUtilityActions,
  type UtilityActionConfig,
} from '@/features/census/components/patient-row/patientActionMenuConfig';
import type {
  PatientActionMenuBinding,
  PatientActionMenuIndicators,
  RowMenuAlign,
} from '@/features/census/components/patient-row/patientRowContracts';
import { resolvePatientActionMenuBinding } from '@/features/census/controllers/patientActionMenuBindingController';

export interface PatientActionMenuCallbackAvailability {
  hasHistoryAction: boolean;
  hasClinicalDocumentsAction: boolean;
  hasExamRequestAction: boolean;
  hasImagingRequestAction: boolean;
}

interface ResolvePatientActionMenuCallbackAvailabilityParams {
  onViewHistory?: () => void;
  onViewClinicalDocuments?: () => void;
  onViewExamRequest?: () => void;
  onViewImagingRequest?: () => void;
}

export const resolvePatientActionMenuCallbackAvailability = ({
  onViewHistory,
  onViewClinicalDocuments,
  onViewExamRequest,
  onViewImagingRequest,
}: ResolvePatientActionMenuCallbackAvailabilityParams): PatientActionMenuCallbackAvailability => ({
  hasHistoryAction: typeof onViewHistory === 'function',
  hasClinicalDocumentsAction: typeof onViewClinicalDocuments === 'function',
  hasExamRequestAction: typeof onViewExamRequest === 'function',
  hasImagingRequestAction: typeof onViewImagingRequest === 'function',
});

interface BuildPatientActionMenuModelParams {
  align?: RowMenuAlign;
  isBlocked: boolean;
  readOnly: boolean;
  showCmaAction?: boolean;
  indicators?: Required<PatientActionMenuIndicators>;
  callbackAvailability: PatientActionMenuCallbackAvailability;
}

export interface PatientActionMenuModel {
  binding: PatientActionMenuBinding;
  utilityActions: UtilityActionConfig[];
}

export const buildPatientActionMenuModel = ({
  align,
  isBlocked,
  readOnly,
  showCmaAction,
  indicators,
  callbackAvailability,
}: BuildPatientActionMenuModelParams): PatientActionMenuModel => ({
  binding: resolvePatientActionMenuBinding({
    align,
    showCmaAction,
    isBlocked,
    readOnly,
    indicators,
    ...callbackAvailability,
  }),
  utilityActions: getVisibleUtilityActions(isBlocked),
});
