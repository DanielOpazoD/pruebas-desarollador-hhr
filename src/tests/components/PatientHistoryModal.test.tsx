import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { PatientHistoryModal } from '@/components/modals/PatientHistoryModal';
import type { PatientData } from '@/types/domain/patient';
import { PatientStatus, Specialty } from '@/types/domain/patientClassification';
import type { PatientHistoryResult } from '@/services/patient/patientHistoryService';
import { getPatientMovementHistory } from '@/services/patient/patientHistoryService';

vi.mock('@/components/shared/BaseModal', () => ({
  BaseModal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <div>{children}</div> : null,
}));

vi.mock('@/services/patient/patientHistoryService', () => ({
  getPatientMovementHistory: vi.fn(),
}));

vi.mock('@/services/utils/loggerScope', () => ({
  createScopedLogger: () => ({
    warn: vi.fn(),
  }),
}));

const basePatient: PatientData = {
  bedId: 'R1',
  isBlocked: false,
  bedMode: 'Cama' as const,
  hasCompanionCrib: false,
  patientName: 'Paciente Test',
  rut: '11.111.111-1',
  age: '40a',
  pathology: 'Diagnostico',
  specialty: Specialty.MEDICINA,
  status: PatientStatus.ESTABLE,
  admissionDate: '2026-03-06',
  hasWristband: false,
  devices: [],
  surgicalComplication: false,
  isUPC: false,
};

const resolvedHistory: PatientHistoryResult = {
  patientName: 'Paciente Test',
  rut: '11.111.111-1',
  totalDays: 2,
  firstSeen: '2026-03-06',
  lastSeen: '2026-03-08',
  movements: [
    {
      date: '2026-03-06',
      bedId: 'R1',
      bedName: 'R1',
      bedType: 'MEDIA',
      type: 'admission',
    },
    {
      date: '2026-03-08',
      bedId: 'R1',
      bedName: 'R1',
      bedType: 'MEDIA',
      type: 'transfer',
    },
  ],
};

const DocumentsProbe = ({
  patient,
}: {
  patient?: (PatientData & { episodeClosureKind?: string }) | null;
}) => (
  <div>
    {patient?.episodeClosureKind ? `closure:${patient.episodeClosureKind}` : 'closure:open'}
  </div>
);

describe('PatientHistoryModal', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('waits for history before mounting documents and injects closure state', async () => {
    let resolveHistory: ((value: PatientHistoryResult) => void) | undefined;
    vi.mocked(getPatientMovementHistory).mockImplementation(
      () =>
        new Promise(resolve => {
          resolveHistory = resolve;
        })
    );

    render(
      <PatientHistoryModal
        isOpen={true}
        onClose={() => {}}
        patientRut="11.111.111-1"
        patientName="Paciente Test"
        patient={basePatient}
        currentDateString="2026-03-08"
        bedId="R1"
        documentsPanel={<DocumentsProbe patient={basePatient} />}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /documentos clínicos/i }));

    expect(screen.getByText(/buscando historial clínico/i)).toBeInTheDocument();
    expect(screen.queryByText('closure:open')).not.toBeInTheDocument();
    expect(screen.queryByText('closure:transfer')).not.toBeInTheDocument();

    resolveHistory?.(resolvedHistory);

    await waitFor(() => {
      expect(screen.getByText('closure:transfer')).toBeInTheDocument();
    });
  });
});
