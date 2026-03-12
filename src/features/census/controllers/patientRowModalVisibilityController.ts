interface ResolvePatientRowModalVisibilityParams {
  showDemographics: boolean;
  showClinicalDocuments: boolean;
  canOpenClinicalDocuments: boolean;
  showExamRequest: boolean;
  canOpenExamRequest: boolean;
  showImagingRequest: boolean;
  canOpenImagingRequest: boolean;
  showHistory: boolean;
  canOpenHistory: boolean;
}

export interface PatientRowModalVisibilityState {
  shouldRenderDemographics: boolean;
  shouldRenderClinicalDocuments: boolean;
  shouldRenderExamRequest: boolean;
  shouldRenderImagingRequest: boolean;
  shouldRenderHistory: boolean;
}

export const resolvePatientRowModalVisibilityState = ({
  showDemographics,
  showClinicalDocuments,
  canOpenClinicalDocuments,
  showExamRequest,
  canOpenExamRequest,
  showImagingRequest,
  canOpenImagingRequest,
  showHistory,
  canOpenHistory,
}: ResolvePatientRowModalVisibilityParams): PatientRowModalVisibilityState => ({
  shouldRenderDemographics: showDemographics,
  shouldRenderClinicalDocuments: showClinicalDocuments && canOpenClinicalDocuments,
  shouldRenderExamRequest: showExamRequest && canOpenExamRequest,
  shouldRenderImagingRequest: showImagingRequest && canOpenImagingRequest,
  shouldRenderHistory: showHistory && canOpenHistory,
});
