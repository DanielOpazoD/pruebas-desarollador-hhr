import type {
  ClinicalActionConfig,
  UtilityActionConfig,
} from '@/features/census/components/patient-row/patientActionMenuConfig';
import { CLINICAL_ACTIONS } from '@/features/census/components/patient-row/patientActionMenuConfig';
import type { PatientActionMenuViewState } from '@/features/census/controllers/patientActionMenuViewController';

interface ResolvePatientActionMenuPanelModelParams {
  viewState: PatientActionMenuViewState;
  utilityActions: UtilityActionConfig[];
  showCmaAction?: boolean;
}

export interface PatientActionMenuPanelModel {
  showHistoryAction: boolean;
  showUtilityActions: boolean;
  utilityActions: UtilityActionConfig[];
  clinicalActions: readonly ClinicalActionConfig[];
}

export const resolvePatientActionMenuPanelModel = ({
  viewState,
  utilityActions,
  showCmaAction = true,
}: ResolvePatientActionMenuPanelModelParams): PatientActionMenuPanelModel => ({
  showHistoryAction: viewState.showHistoryAction,
  showUtilityActions: viewState.showUtilityActions,
  utilityActions,
  clinicalActions: viewState.showBuiltInClinicalActions
    ? CLINICAL_ACTIONS.filter(action => action.action !== 'cma' || showCmaAction)
    : [],
});
