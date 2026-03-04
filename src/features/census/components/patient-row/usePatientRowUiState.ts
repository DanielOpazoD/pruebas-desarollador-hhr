import { useCallback, useState } from 'react';

interface UsePatientRowUiStateResult {
  showDemographics: boolean;
  showClinicalDocuments: boolean;
  showExamRequest: boolean;
  showImagingRequest: boolean;
  showHistory: boolean;
  openDemographics: () => void;
  closeDemographics: () => void;
  openClinicalDocuments: () => void;
  closeClinicalDocuments: () => void;
  openExamRequest: () => void;
  closeExamRequest: () => void;
  openImagingRequest: () => void;
  closeImagingRequest: () => void;
  openHistory: () => void;
  closeHistory: () => void;
}

export const usePatientRowUiState = (): UsePatientRowUiStateResult => {
  const [showDemographics, setShowDemographics] = useState(false);
  const [showClinicalDocuments, setShowClinicalDocuments] = useState(false);
  const [showExamRequest, setShowExamRequest] = useState(false);
  const [showImagingRequest, setShowImagingRequest] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const openDemographics = useCallback(() => setShowDemographics(true), []);
  const closeDemographics = useCallback(() => setShowDemographics(false), []);
  const openClinicalDocuments = useCallback(() => setShowClinicalDocuments(true), []);
  const closeClinicalDocuments = useCallback(() => setShowClinicalDocuments(false), []);
  const openExamRequest = useCallback(() => setShowExamRequest(true), []);
  const closeExamRequest = useCallback(() => setShowExamRequest(false), []);
  const openImagingRequest = useCallback(() => setShowImagingRequest(true), []);
  const closeImagingRequest = useCallback(() => setShowImagingRequest(false), []);
  const openHistory = useCallback(() => setShowHistory(true), []);
  const closeHistory = useCallback(() => setShowHistory(false), []);

  return {
    showDemographics,
    showClinicalDocuments,
    showExamRequest,
    showImagingRequest,
    showHistory,
    openDemographics,
    closeDemographics,
    openClinicalDocuments,
    closeClinicalDocuments,
    openExamRequest,
    closeExamRequest,
    openImagingRequest,
    closeImagingRequest,
    openHistory,
    closeHistory,
  };
};
