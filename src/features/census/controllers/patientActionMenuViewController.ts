export interface ResolvePatientActionMenuViewParams {
  isBlocked: boolean;
  readOnly: boolean;
  hasHistoryAction: boolean;
  hasClinicalDocumentsAction: boolean;
  hasExamRequestAction: boolean;
  hasImagingRequestAction: boolean;
}

export interface PatientActionMenuViewState {
  showDemographicsAction: boolean;
  showMenuTrigger: boolean;
  showHistoryAction: boolean;
  showUtilityActions: boolean;
  showClinicalSection: boolean;
  showClinicalDocumentsAction: boolean;
  showExamRequestAction: boolean;
  showImagingRequestAction: boolean;
}

export const resolvePatientActionMenuViewState = ({
  isBlocked,
  readOnly,
  hasHistoryAction,
  hasClinicalDocumentsAction,
  hasExamRequestAction,
  hasImagingRequestAction,
}: ResolvePatientActionMenuViewParams): PatientActionMenuViewState => {
  const showUtilityActions = !readOnly;
  const showMenuTrigger = !readOnly || hasHistoryAction || hasClinicalDocumentsAction;
  const showDemographicsAction = !isBlocked && !readOnly;
  const showClinicalSection = !isBlocked && (!readOnly || hasClinicalDocumentsAction);
  const showHistoryAction = !readOnly && hasHistoryAction;

  return {
    showDemographicsAction,
    showMenuTrigger,
    showHistoryAction,
    showUtilityActions,
    showClinicalSection,
    showClinicalDocumentsAction: showClinicalSection && hasClinicalDocumentsAction,
    showExamRequestAction: !readOnly && showClinicalSection && hasExamRequestAction,
    showImagingRequestAction: !readOnly && showClinicalSection && hasImagingRequestAction,
  };
};

export const resolvePatientActionMenuPanelClassName = (align: 'top' | 'bottom'): string =>
  align === 'top' ? 'top-0' : 'bottom-0';
