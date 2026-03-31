import React from 'react';
import { PatientBedConfig } from './PatientBedConfig';
import { PatientInputCells } from './PatientInputCells';
import { PatientMainRowActionCell } from './PatientMainRowActionCell';
import { PatientMainRowBedTypeCell } from './PatientMainRowBedTypeCell';
import { PatientMainRowBlockedCell } from './PatientMainRowBlockedCell';
import type { PatientMainRowViewProps } from './patientRowViewContracts';
import { usePatientMainRowSectionsModel } from './usePatientMainRowSectionsModel';

export const PatientMainRowView: React.FC<PatientMainRowViewProps> = ({
  bed,
  bedType,
  data,
  currentDateString,
  style,
  readOnly,
  actionMenuAlign,
  diagnosisMode,
  isBlocked,
  isEmpty,
  hasCompanion,
  hasClinicalCrib,
  isCunaMode,
  indicators,
  mainRowViewState,
  accessProfile = 'default',
  onAction,
  onOpenDemographics,
  onOpenClinicalDocuments,
  onOpenExamRequest,
  onOpenImagingRequest,
  onOpenHistory,
  onToggleMode,
  onToggleCompanion,
  onToggleClinicalCrib,
  onToggleBedType,
  onUpdateClinicalCrib,
  onChange,
}) => {
  const sections = usePatientMainRowSectionsModel({
    bed,
    bedType,
    data,
    currentDateString,
    style,
    readOnly,
    actionMenuAlign,
    diagnosisMode,
    isBlocked,
    isEmpty,
    hasCompanion,
    hasClinicalCrib,
    isCunaMode,
    indicators,
    mainRowViewState,
    accessProfile,
    onAction,
    onOpenDemographics,
    onOpenClinicalDocuments,
    onOpenExamRequest,
    onOpenImagingRequest,
    onOpenHistory,
    onToggleMode,
    onToggleCompanion,
    onToggleClinicalCrib,
    onToggleBedType,
    onUpdateClinicalCrib,
    onChange,
  });

  return (
    <tr
      className={`${mainRowViewState.rowClassName} group/patient-row`}
      style={style}
      data-testid="patient-row"
      data-bed-id={bed.id}
    >
      <PatientMainRowActionCell {...sections.action} />

      <PatientBedConfig {...sections.bedConfig} />

      <PatientMainRowBedTypeCell {...sections.bedType} />

      {mainRowViewState.showBlockedContent ? (
        <PatientMainRowBlockedCell {...sections.blocked} />
      ) : (
        <PatientInputCells {...sections.inputCells} />
      )}
    </tr>
  );
};
