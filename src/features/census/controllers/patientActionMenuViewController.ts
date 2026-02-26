export interface ResolvePatientActionMenuViewParams {
  isBlocked: boolean;
  readOnly: boolean;
  hasHistoryAction: boolean;
  hasExamRequestAction: boolean;
  hasImagingRequestAction: boolean;
}

export interface PatientActionMenuViewState {
  showDemographicsAction: boolean;
  showMenuTrigger: boolean;
  showHistoryAction: boolean;
  showClinicalSection: boolean;
  showExamRequestAction: boolean;
  showImagingRequestAction: boolean;
}

export const resolvePatientActionMenuViewState = ({
  isBlocked,
  readOnly,
  hasHistoryAction,
  hasExamRequestAction,
  hasImagingRequestAction,
}: ResolvePatientActionMenuViewParams): PatientActionMenuViewState => {
  const showMenuTrigger = !readOnly;
  const showDemographicsAction = !isBlocked && !readOnly;
  const showClinicalSection = !isBlocked && !readOnly;
  const showHistoryAction = !readOnly && hasHistoryAction;

  return {
    showDemographicsAction,
    showMenuTrigger,
    showHistoryAction,
    showClinicalSection,
    showExamRequestAction: showClinicalSection && hasExamRequestAction,
    showImagingRequestAction: showClinicalSection && hasImagingRequestAction,
  };
};

export const resolvePatientActionMenuPanelClassName = (align: 'top' | 'bottom'): string =>
  align === 'top' ? 'top-0' : 'bottom-0';
