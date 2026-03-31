import React from 'react';
import { createPortal } from 'react-dom';

import '@/features/clinical-documents/styles/clinicalDocumentSheet.css';
import type { PatientData } from '@/features/clinical-documents/contracts/clinicalDocumentsPatientContract';
import { ClinicalDocumentFormattingToolbar } from '@/features/clinical-documents/components/ClinicalDocumentFormattingToolbar';
import { ClinicalDocumentsSidebar } from '@/features/clinical-documents/components/ClinicalDocumentsSidebar';
import { ClinicalDocumentSheet } from '@/features/clinical-documents/components/ClinicalDocumentSheet';
import { useClinicalDocumentsWorkspaceModel } from '@/features/clinical-documents/hooks/useClinicalDocumentsWorkspaceModel';
import { useClinicalDocumentSheetState } from '@/features/clinical-documents/hooks/useClinicalDocumentSheetState';

interface ClinicalDocumentsWorkspaceProps {
  patient: PatientData;
  currentDateString: string;
  bedId: string;
  isActive?: boolean;
  headerActionsContainerId?: string;
}

export const ClinicalDocumentsWorkspace: React.FC<ClinicalDocumentsWorkspaceProps> = ({
  patient,
  currentDateString,
  bedId,
  isActive = true,
  headerActionsContainerId,
}) => {
  const { canRead, sidebarProps, sheetProps } = useClinicalDocumentsWorkspaceModel({
    patient,
    currentDateString,
    bedId,
    isActive,
  });
  const sheetState = useClinicalDocumentSheetState(sheetProps.selectedDocument);

  if (!canRead) {
    return (
      <p className="p-4 text-sm text-slate-600">No tienes permisos para acceder a este módulo.</p>
    );
  }

  const toolbarNode = sheetProps.selectedDocument ? (
    <ClinicalDocumentFormattingToolbar
      selectedDocument={sheetProps.selectedDocument}
      canEdit={sheetProps.canEdit}
      isSaving={sheetProps.isSaving}
      isUploadingPdf={sheetProps.isUploadingPdf}
      formattingDisabled={sheetState.formattingDisabled || !sheetProps.canEdit}
      isFormattingOpen={sheetState.isFormattingOpen}
      activeEditorHistoryState={sheetState.activeEditorHistoryState}
      onPrint={sheetProps.onPrint}
      onUploadPdf={sheetProps.onUploadPdf}
      onRestoreTemplate={sheetProps.onRestoreTemplate}
      onToggleFormatting={() => sheetState.setIsFormattingOpen(prev => !prev)}
      onApplyFormatting={sheetState.applyFormatting}
    />
  ) : null;

  const headerActionsContainer = headerActionsContainerId
    ? document.getElementById(headerActionsContainerId)
    : null;

  return (
    <div
      className="grid h-[82vh] min-h-[82vh] grid-cols-[260px_minmax(0,1fr)]"
      data-testid="clinical-documents-workspace"
    >
      {toolbarNode && headerActionsContainer
        ? createPortal(toolbarNode, headerActionsContainer)
        : null}
      <ClinicalDocumentsSidebar {...sidebarProps} />

      <section className="relative overflow-y-auto overflow-x-hidden bg-[#f3f4f6] p-3">
        <ClinicalDocumentSheet
          {...sheetProps}
          toolbar={toolbarNode && !headerActionsContainer ? toolbarNode : null}
          activeTitleTarget={sheetState.activeTitleTarget}
          onSetActiveTitleTarget={sheetState.setActiveTitleTarget}
          draggedSectionId={sheetState.draggedSectionId}
          dragOverSectionId={sheetState.dragOverSectionId}
          activePlanSubsectionId={sheetState.activePlanSubsectionId}
          activeIndicationsSpecialtyId={sheetState.activeIndicationsSpecialtyId}
          isIndicationsPanelOpen={sheetState.isIndicationsPanelOpen}
          onSetActivePlanSubsectionId={sheetState.setActivePlanSubsectionId}
          onSetActiveIndicationsSpecialtyId={sheetState.setActiveIndicationsSpecialtyId}
          onToggleIndicationsPanel={() => sheetState.setIsIndicationsPanelOpen(prev => !prev)}
          onEditorActivate={sheetState.handleEditorActivate}
          onEditorDeactivate={sheetState.handleEditorDeactivate}
          dragHandlers={sheetState.sectionDragHandlers}
        />
      </section>
    </div>
  );
};
