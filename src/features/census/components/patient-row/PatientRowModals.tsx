import React from 'react';
import { DemographicsModal } from '@/components/modals/DemographicsModal';
import { ExamRequestModal } from '@/components/modals/ExamRequestModal';
import { ImagingRequestDialog } from '@/components/modals/ImagingRequestDialog';
import { PatientHistoryModal } from '@/components/modals/PatientHistoryModal';
import { resolvePatientRowDemographicsBinding } from '@/features/census/controllers/patientRowModalController';
import type { PatientRowModalsProps } from '@/features/census/components/patient-row/patientRowViewContracts';

export const PatientRowModals: React.FC<PatientRowModalsProps> = ({
  bedId,
  data,
  currentDateString,
  isSubRow,
  showDemographics,
  showExamRequest,
  showImagingRequest,
  showHistory,
  onCloseDemographics,
  onCloseExamRequest,
  onCloseImagingRequest,
  onCloseHistory,
  onSaveDemographics,
  onSaveCribDemographics,
}) => {
  const demographicsBinding = resolvePatientRowDemographicsBinding({
    bedId,
    isSubRow,
    onSaveDemographics,
    onSaveCribDemographics,
  });

  return (
    <>
      <DemographicsModal
        key={`demographics-${demographicsBinding.targetBedId}-${showDemographics ? 'open' : 'closed'}-${data.patientName}-${data.rut}-${data.identityStatus || 'na'}`}
        isOpen={showDemographics}
        onClose={onCloseDemographics}
        data={data}
        onSave={demographicsBinding.onSave}
        bedId={demographicsBinding.targetBedId}
        recordDate={currentDateString}
        isClinicalCribPatient={isSubRow}
      />

      {showExamRequest && (
        <ExamRequestModal
          key={`exam-request-${bedId}-${showExamRequest}`}
          isOpen={showExamRequest}
          onClose={onCloseExamRequest}
          patient={data}
        />
      )}

      <ImagingRequestDialog
        isOpen={showImagingRequest}
        onClose={onCloseImagingRequest}
        patient={data}
      />

      <PatientHistoryModal
        isOpen={showHistory}
        onClose={onCloseHistory}
        patientRut={data.rut || ''}
        patientName={data.patientName}
      />
    </>
  );
};
