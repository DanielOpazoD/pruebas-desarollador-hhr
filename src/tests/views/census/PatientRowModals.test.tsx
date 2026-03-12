import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PatientRowModals } from '@/features/census/components/patient-row/PatientRowModals';
import { DataFactory } from '@/tests/factories/DataFactory';

vi.mock('@/components/modals/DemographicsModal', () => ({
  DemographicsModal: ({
    bedId,
    isClinicalCribPatient,
  }: {
    bedId: string;
    isClinicalCribPatient?: boolean;
  }) => <div data-rn-context={String(Boolean(isClinicalCribPatient))}>Demographics {bedId}</div>,
}));

vi.mock('@/components/modals/ExamRequestModal', () => ({
  ExamRequestModal: () => <div>Exam Request</div>,
}));

vi.mock('@/components/modals/ImagingRequestDialog', () => ({
  ImagingRequestDialog: () => <div>Imaging Request</div>,
}));

vi.mock('@/components/modals/PatientHistoryModal', () => ({
  PatientHistoryModal: () => <div>Patient History</div>,
}));

vi.mock('@/features/clinical-documents', () => ({
  ClinicalDocumentsModal: () => <div>Clinical Documents</div>,
}));

describe('PatientRowModals', () => {
  const baseProps = {
    bedId: 'R1',
    data: DataFactory.createMockPatient('R1', {
      patientName: 'Paciente',
      rut: '11.111.111-1',
    }),
    currentDateString: '2026-03-05',
    isSubRow: false,
    showDemographics: false,
    showClinicalDocuments: false,
    canOpenClinicalDocuments: false,
    showExamRequest: false,
    canOpenExamRequest: true,
    showImagingRequest: false,
    canOpenImagingRequest: true,
    showHistory: false,
    canOpenHistory: true,
    onCloseDemographics: vi.fn(),
    onCloseClinicalDocuments: vi.fn(),
    onCloseExamRequest: vi.fn(),
    onCloseImagingRequest: vi.fn(),
    onCloseHistory: vi.fn(),
    onSaveDemographics: vi.fn(),
    onSaveCribDemographics: vi.fn(),
  } as const;

  it('mounts only active modals', () => {
    render(
      <PatientRowModals
        {...baseProps}
        showDemographics
        showExamRequest
        showImagingRequest
        showHistory
      />
    );

    expect(screen.getByText('Demographics R1')).toBeInTheDocument();
    expect(screen.getByText('Demographics R1')).toHaveAttribute('data-rn-context', 'false');
    expect(screen.getByText('Exam Request')).toBeInTheDocument();
    expect(screen.getByText('Imaging Request')).toBeInTheDocument();
    expect(screen.getByText('Patient History')).toBeInTheDocument();
    expect(screen.queryByText('Clinical Documents')).not.toBeInTheDocument();
  });

  it('does not mount clinical documents modal when user lacks permission', () => {
    render(
      <PatientRowModals {...baseProps} showClinicalDocuments canOpenClinicalDocuments={false} />
    );

    expect(screen.queryByText('Clinical Documents')).not.toBeInTheDocument();
  });

  it('mounts clinical documents modal when requested and authorized', () => {
    render(<PatientRowModals {...baseProps} showClinicalDocuments canOpenClinicalDocuments />);

    expect(screen.getByText('Clinical Documents')).toBeInTheDocument();
  });

  it('does not mount history, exam or imaging modals when capability is missing', () => {
    render(
      <PatientRowModals
        {...baseProps}
        showExamRequest
        canOpenExamRequest={false}
        showImagingRequest
        canOpenImagingRequest={false}
        showHistory
        canOpenHistory={false}
      />
    );

    expect(screen.queryByText('Exam Request')).not.toBeInTheDocument();
    expect(screen.queryByText('Imaging Request')).not.toBeInTheDocument();
    expect(screen.queryByText('Patient History')).not.toBeInTheDocument();
  });

  it('enables RN identity context for main-row patients in Cuna mode', () => {
    render(
      <PatientRowModals
        {...baseProps}
        showDemographics
        data={DataFactory.createMockPatient('R1', {
          patientName: 'RN principal',
          rut: '',
          bedMode: 'Cuna',
        })}
      />
    );

    expect(screen.getByText('Demographics R1')).toHaveAttribute('data-rn-context', 'true');
  });
});
