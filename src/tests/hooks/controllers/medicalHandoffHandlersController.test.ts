import { describe, expect, it } from 'vitest';
import type { PatientData } from '@/types/domain/patient';
import { PatientStatus, Specialty } from '@/types/domain/patientClassification';
import {
  resolveMedicalHandoffMutationContext,
  resolveRefreshableMedicalEntry,
  shouldLogMedicalHandoffOutcome,
} from '@/hooks/controllers/medicalHandoffHandlersController';

const buildPatient = (overrides: Partial<PatientData> = {}): PatientData => ({
  bedId: '101',
  isBlocked: false,
  bedMode: 'Cama',
  hasCompanionCrib: false,
  patientName: 'Paciente Demo',
  rut: '1-9',
  age: '30',
  pathology: 'Observacion',
  specialty: Specialty.MEDICINA,
  status: PatientStatus.ESTABLE,
  admissionDate: '2026-03-29',
  hasWristband: true,
  devices: [],
  surgicalComplication: false,
  isUPC: false,
  ...overrides,
});

describe('medicalHandoffHandlersController', () => {
  it('blocks mutations when the medical handoff is not editable', () => {
    expect(
      resolveMedicalHandoffMutationContext({
        bedId: '101',
        isNested: false,
        isMedical: true,
        canMutateCurrentMedicalRecord: false,
        record: {
          date: '2026-03-29',
          beds: {
            '101': buildPatient(),
          },
        },
      })
    ).toBeNull();
  });

  it('resolves the nested clinical crib patient when editing a provisional crib row', () => {
    const clinicalCrib = buildPatient({
      bedId: '101C',
      patientName: 'RN clínico',
      bedMode: 'Cuna',
    });

    expect(
      resolveMedicalHandoffMutationContext({
        bedId: '101',
        isNested: true,
        isMedical: true,
        canMutateCurrentMedicalRecord: true,
        record: {
          date: '2026-03-29',
          beds: {
            '101': buildPatient({
              clinicalCrib,
            }),
          },
        },
      })
    ).toEqual({
      bedId: '101',
      isNested: true,
      patient: clinicalCrib,
      recordDate: '2026-03-29',
    });
  });

  it('keeps silent domain failures out of the unexpected outcome logger', () => {
    expect(
      shouldLogMedicalHandoffOutcome({
        status: 'failed',
        data: null,
        reason: 'missing_patient',
        issues: [],
      })
    ).toBe(false);

    expect(
      shouldLogMedicalHandoffOutcome({
        status: 'failed',
        data: null,
        reason: 'write_failed',
        issues: [],
      })
    ).toBe(true);
  });

  it('returns only refreshable entries with a non-empty note', () => {
    const patient = buildPatient({
      medicalHandoffEntries: [
        {
          id: 'entry-empty',
          specialty: Specialty.MEDICINA,
          note: '   ',
        },
        {
          id: 'entry-valid',
          specialty: Specialty.MEDICINA,
          note: 'Paciente estable',
        },
      ],
    });

    expect(resolveRefreshableMedicalEntry(patient, 'entry-empty')).toBeNull();
    expect(resolveRefreshableMedicalEntry(patient, 'missing-entry')).toBeNull();
    expect(resolveRefreshableMedicalEntry(patient, 'entry-valid')).toEqual({
      id: 'entry-valid',
      specialty: Specialty.MEDICINA,
      note: 'Paciente estable',
    });
  });
});
