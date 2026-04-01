import { useMemo } from 'react';

import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/UIContext';
import { getActiveHospitalId } from '@/constants/firestorePaths';
import type { PatientData } from '@/features/clinical-documents/contracts/clinicalDocumentsPatientContract';
import {
  canDeleteClinicalDocuments,
  canEditClinicalDocuments,
  canReadClinicalDocuments,
} from '@/features/clinical-documents/controllers/clinicalDocumentPermissionController';
import {
  buildClinicalDocumentsReadOnlyMessage,
  canMutateClinicalDocumentsEpisode,
  resolveClinicalDocumentPersistReason,
} from '@/features/clinical-documents/controllers/clinicalDocumentEpisodeStatusController';
import { buildClinicalDocumentWorkspaceNotifyPort } from '@/features/clinical-documents/controllers/clinicalDocumentWorkspaceController';
import type { ClinicalDocumentSheetProps } from '@/features/clinical-documents/components/clinicalDocumentSheetShared';
import type { ClinicalDocumentsSidebarProps } from '@/features/clinical-documents/contracts/clinicalDocumentsSidebarContracts';
import { useClinicalDocumentIndicationsCatalog } from '@/features/clinical-documents/hooks/useClinicalDocumentIndicationsCatalog';
import { useClinicalDocumentWorkspaceBootstrap } from '@/features/clinical-documents/hooks/useClinicalDocumentWorkspaceBootstrap';
import { useClinicalDocumentWorkspaceDraft } from '@/features/clinical-documents/hooks/useClinicalDocumentWorkspaceDraft';
import { useClinicalDocumentWorkspaceDocumentActions } from '@/features/clinical-documents/hooks/useClinicalDocumentWorkspaceDocumentActions';
import { useClinicalDocumentWorkspaceExportActions } from '@/features/clinical-documents/hooks/useClinicalDocumentWorkspaceExportActions';

interface UseClinicalDocumentsWorkspaceModelParams {
  patient: PatientData;
  currentDateString: string;
  bedId: string;
  isActive: boolean;
}

type ClinicalDocumentsWorkspaceSheetProps = Omit<
  ClinicalDocumentSheetProps,
  | 'toolbar'
  | 'activeTitleTarget'
  | 'onSetActiveTitleTarget'
  | 'draggedSectionId'
  | 'dragOverSectionId'
  | 'activePlanSubsectionId'
  | 'activeIndicationsSpecialtyId'
  | 'isIndicationsPanelOpen'
  | 'onSetActivePlanSubsectionId'
  | 'onSetActiveIndicationsSpecialtyId'
  | 'onToggleIndicationsPanel'
  | 'onEditorActivate'
  | 'onEditorDeactivate'
  | 'dragHandlers'
>;

interface ClinicalDocumentsWorkspaceModel {
  canRead: boolean;
  sidebarProps: ClinicalDocumentsSidebarProps;
  sheetProps: ClinicalDocumentsWorkspaceSheetProps;
}

export const useClinicalDocumentsWorkspaceModel = ({
  patient,
  currentDateString,
  bedId,
  isActive,
}: UseClinicalDocumentsWorkspaceModelParams): ClinicalDocumentsWorkspaceModel => {
  const { user, role } = useAuth();
  const { success, warning, error: notifyError, info, confirm } = useNotification();

  const canRead = canReadClinicalDocuments(role);
  const canEditByRole = canEditClinicalDocuments(role);
  const canDeleteByRole = canDeleteClinicalDocuments(role);
  const canMutateEpisode = canMutateClinicalDocumentsEpisode(patient, role);
  const canEdit = canEditByRole && canMutateEpisode;
  const canDelete = canDeleteByRole && canMutateEpisode;
  const readOnlyMessage = buildClinicalDocumentsReadOnlyMessage(patient, role, canEditByRole);
  const persistReason = resolveClinicalDocumentPersistReason(patient, role);
  const hospitalId = getActiveHospitalId();
  const notifyPort = useMemo(
    () => buildClinicalDocumentWorkspaceNotifyPort(success, warning, notifyError, info, confirm),
    [confirm, info, notifyError, success, warning]
  );

  const {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
    episode,
  } = useClinicalDocumentWorkspaceBootstrap({
    patient,
    currentDateString,
    bedId,
    isActive,
    canRead,
    hospitalId,
    role,
  });

  const {
    draft,
    setDraft,
    isSaving,
    validationIssues,
    lastPersistedSnapshotRef,
    patchPatientField,
    patchPatientFieldLabel,
    setPatientFieldVisibility,
    patchSection,
    patchSectionTitle,
    setSectionLayout,
    setSectionVisibility,
    moveSection,
    reorderSection,
    patchDocumentTitle,
    patchPatientInfoTitle,
    patchFooterLabel,
    patchDocumentMeta,
    applyTemplate,
    restoreTemplateContent,
  } = useClinicalDocumentWorkspaceDraft({
    documents,
    selectedDocumentId,
    canEdit,
    isActive,
    hospitalId,
    role,
    persistReason,
    user,
  });

  const selectedDocument = draft;
  const sidebarDocuments = useMemo(
    () =>
      draft ? documents.map(document => (document.id === draft.id ? draft : document)) : documents,
    [documents, draft]
  );

  const {
    indicationsCatalog,
    isSavingCustomIndication,
    customIndicationError,
    addCustomIndication,
    updateIndication,
    deleteIndication,
    importCatalog,
  } = useClinicalDocumentIndicationsCatalog({
    hospitalId,
    isActive,
    canEdit,
  });

  const { createDocument, handleDeleteDocument } = useClinicalDocumentWorkspaceDocumentActions({
    patient,
    role,
    user,
    hospitalId,
    episode,
    selectedTemplateId,
    templates,
    selectedDocumentId,
    canEdit,
    canDelete,
    notify: notifyPort,
    setSelectedDocumentId,
    setDraft,
    lastPersistedSnapshotRef,
  });

  const { handlePrint, handleUploadPdf, isUploadingPdf } =
    useClinicalDocumentWorkspaceExportActions({
      selectedDocument,
      hospitalId,
      notify: notifyPort,
      setDraft,
    });

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!draft || !canEdit || draft.isLocked) {
      return;
    }
    applyTemplate(templateId);
  };

  const handleRestoreTemplate = async () => {
    if (!draft || !canEdit || draft.isLocked) {
      return;
    }

    const confirmed = await confirm({
      title: 'Reestablecer plantilla del documento',
      message:
        'Se restaurarán el título, las etiquetas y las secciones base de la plantilla. El contenido clínico editable actual se reemplazará por la estructura original del documento.',
      confirmText: 'Reestablecer',
      cancelText: 'Cancelar',
      variant: 'warning',
    });

    if (!confirmed) {
      return;
    }

    restoreTemplateContent();
    info(
      'Plantilla reestablecida',
      'El documento volvió a su estructura base y quedó listo para seguir editando.'
    );
  };

  return {
    canRead,
    sidebarProps: {
      canEdit,
      canDelete,
      readOnlyMessage,
      patientName: patient.patientName,
      templates,
      selectedTemplateId,
      onSelectTemplate: handleSelectTemplate,
      onCreateDocument: () => void createDocument(),
      documents: sidebarDocuments,
      selectedDocumentId,
      onSelectDocument: setSelectedDocumentId,
      onDeleteDocument: document => void handleDeleteDocument(document),
    },
    sheetProps: {
      selectedDocument,
      canEdit,
      isSaving,
      isUploadingPdf,
      validationIssues,
      onPrint: handlePrint,
      onUploadPdf: () => void handleUploadPdf(),
      onRestoreTemplate: () => void handleRestoreTemplate(),
      patchDocumentTitle,
      patchPatientInfoTitle,
      patchPatientField,
      patchPatientFieldLabel,
      setPatientFieldVisibility,
      patchSectionTitle,
      patchSection,
      setSectionLayout,
      setSectionVisibility,
      moveSection,
      reorderSection,
      patchFooterLabel,
      patchDocumentMeta,
      indicationsCatalog,
      isSavingCustomIndication,
      customIndicationError,
      addCustomIndication,
      updateIndication,
      deleteIndication,
      importIndicationsCatalog: importCatalog,
    },
  };
};
