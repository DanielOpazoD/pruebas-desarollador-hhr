import React from 'react';
import { HandoffHeader } from './HandoffHeader';
import { HandoffChecklistSection } from './HandoffChecklistSection';
import { HandoffCudyrPrint } from './HandoffCudyrPrint';
import { HandoffNightCudyrActionButton } from './HandoffNightCudyrActionButton';
import { HandoffPrintHeader } from './HandoffPrintHeader';
import { HandoffMedicalContent } from './HandoffMedicalContent';
import { HandoffNursingContent } from './HandoffNursingContent';
import { useUIState, UseUIStateReturn } from '@/hooks/useUIState';
import { shouldShowNightCudyrActions } from '@/features/handoff/controllers/handoffViewController';
import type { MedicalHandoffScope } from '@/types/medicalHandoff';
import { useHandoffViewScreenModel } from '@/features/handoff/hooks/useHandoffViewScreenModel';
interface HandoffViewProps {
  type?: 'nursing' | 'medical';
  readOnly?: boolean;
  ui?: UseUIStateReturn;
  medicalScope?: MedicalHandoffScope;
}
export const HandoffView: React.FC<HandoffViewProps> = ({
  type = 'nursing',
  readOnly = false,
  ui: propUi,
  medicalScope,
}) => {
  const localUi = useUIState();
  const screenModel = useHandoffViewScreenModel({
    type,
    readOnly,
    ui: propUi || localUi,
    medicalScope,
  });
  const {
    ui,
    record,
    isMedical,
    role,
    title,
    readOnly: effectiveReadOnly,
    nursesList,
    success,
    schedule,
    noteField,
    deliversList,
    receivesList,
    tensList,
    hasAnyPatients,
    visibleBeds,
    selectedShift,
    setSelectedShift,
    selectedMedicalSpecialty,
    setSelectedMedicalSpecialty,
    medicalBindings,
    medicalCapabilities,
    medicalActions,
    clinicalEventActions,
    formatPrintDate,
    shouldShowPatient,
    handleNursingNoteChange,
    handleShareLink,
    handleSendWhatsAppManual,
    updateHandoffChecklist,
    updateHandoffNovedades,
    updateHandoffStaff,
    updateMedicalHandoffDoctor,
    markMedicalHandoffAsSent,
    resetMedicalHandoffState,
    tableHeaderClass,
    Icon,
  } = screenModel;
  const handleOpenCudyr = () => ui.setCurrentModule('CUDYR');
  if (!record) {
    return (
      <div className="p-8 text-center text-slate-500 font-sans">
        Seleccione una fecha para ver la Entrega de Turno.
      </div>
    );
  }
  return (
    <div className="space-y-3 print:space-y-2 animate-fade-in pb-20 font-sans max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 print:max-w-none print:w-full print:px-0 print:pb-0">
      <HandoffPrintHeader
        title={title}
        dateString={formatPrintDate()}
        Icon={Icon}
        isMedical={isMedical}
        schedule={schedule}
        selectedShift={selectedShift}
        deliversList={deliversList}
        receivesList={receivesList}
        tensList={tensList}
      />
      <HandoffHeader
        isMedical={isMedical}
        selectedShift={selectedShift}
        setSelectedShift={setSelectedShift}
        readOnly={effectiveReadOnly}
        showMedicalShareActions={medicalCapabilities.canShareSignatureLinks}
        medicalSignature={medicalBindings.scopedMedicalSignature}
        medicalHandoffSentAt={medicalBindings.scopedMedicalHandoffSentAt}
        onSendWhatsApp={handleSendWhatsAppManual}
        onShareLink={handleShareLink}
        extraAction={
          medicalCapabilities.canOpenNightCudyr &&
          shouldShowNightCudyrActions({ isMedical, selectedShift }) ? (
            <HandoffNightCudyrActionButton onClick={handleOpenCudyr} />
          ) : undefined
        }
      />
      <HandoffChecklistSection
        isMedical={isMedical}
        selectedShift={selectedShift}
        record={record}
        deliversList={deliversList}
        receivesList={receivesList}
        nursesList={nursesList}
        readOnly={effectiveReadOnly}
        onUpdateStaff={updateHandoffStaff}
        onUpdateChecklist={updateHandoffChecklist}
      />
      {isMedical ? (
        <HandoffMedicalContent
          record={record}
          effectiveVisibleBeds={medicalBindings.effectiveVisibleBeds}
          specialtyFilteredBeds={medicalBindings.specialtyFilteredBeds}
          readOnly={effectiveReadOnly}
          role={role}
          canCopySpecialistLink={medicalCapabilities.canCopySpecialistLink}
          scopedMedicalSignature={medicalBindings.scopedMedicalSignature}
          scopedMedicalHandoffSentAt={medicalBindings.scopedMedicalHandoffSentAt}
          showDeliverySection={medicalCapabilities.canShowDeliverySection}
          canEditDoctorName={medicalCapabilities.canEditDoctorName}
          canSignMedicalHandoff={medicalCapabilities.canSign}
          updateMedicalHandoffDoctor={
            medicalCapabilities.canEditDoctorName ? updateMedicalHandoffDoctor : undefined
          }
          markMedicalHandoffAsSent={
            medicalCapabilities.canSign ? markMedicalHandoffAsSent : undefined
          }
          resetMedicalHandoffState={
            medicalCapabilities.canRestoreSignatures ? resetMedicalHandoffState : undefined
          }
          selectedMedicalSpecialty={selectedMedicalSpecialty}
          setSelectedMedicalSpecialty={setSelectedMedicalSpecialty}
          medicalSpecialties={medicalBindings.medicalSpecialties}
          success={success}
          noteField={noteField}
          onNoteChange={handleNursingNoteChange}
          medicalActions={medicalActions}
          clinicalEventActions={clinicalEventActions}
          tableHeaderClass={tableHeaderClass}
          shouldShowPatient={shouldShowPatient}
          scopedMedicalScope={medicalBindings.scopedMedicalScope}
          hasAnyVisiblePatients={medicalBindings.hasAnyVisiblePatients}
        />
      ) : (
        <HandoffNursingContent
          visibleBeds={visibleBeds}
          record={record}
          noteField={noteField}
          onNoteChange={handleNursingNoteChange}
          medicalActions={medicalActions}
          tableHeaderClass={tableHeaderClass}
          readOnly={effectiveReadOnly}
          hasAnyPatients={hasAnyPatients}
          shouldShowPatient={shouldShowPatient}
          clinicalEventActions={clinicalEventActions}
          selectedShift={selectedShift}
          updateHandoffNovedades={updateHandoffNovedades}
        />
      )}
      {shouldShowNightCudyrActions({ isMedical, selectedShift }) && (
        <div className="print:break-before-page">
          <HandoffCudyrPrint />
        </div>
      )}
    </div>
  );
};
