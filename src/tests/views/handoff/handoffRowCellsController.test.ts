import { describe, expect, it } from 'vitest';
import {
  canToggleClinicalEvents,
  resolveHandoffStatusVariant,
  resolveMedicalObservationEntries,
  shouldRenderClinicalEventsPanel,
} from '@/features/handoff/controllers/handoffRowCellsController';
import type { PatientData } from '@/types/domain/patient';
import { PatientStatus, Specialty } from '@/types/domain/patientClassification';

const buildPatient = (overrides: Partial<PatientData> = {}): PatientData =>
  ({
    patientName: 'Paciente Test',
    rut: '11.111.111-1',
    pathology: 'Diagnóstico',
    status: PatientStatus.ESTABLE,
    specialty: Specialty.MEDICINA,
    devices: [],
    deviceDetails: {},
    clinicalEvents: [],
    medicalHandoffEntries: [],
    age: '40a',
    admissionDate: '2026-03-15',
    ...overrides,
  }) as PatientData;

describe('handoffRowCellsController', () => {
  it('maps patient status to badge variants', () => {
    expect(resolveHandoffStatusVariant(PatientStatus.GRAVE)).toBe('red');
    expect(resolveHandoffStatusVariant(PatientStatus.DE_CUIDADO)).toBe('orange');
    expect(resolveHandoffStatusVariant(PatientStatus.ESTABLE)).toBe('green');
    expect(resolveHandoffStatusVariant(undefined)).toBe('green');
  });

  it('enables event toggle only for top-level rows with edit access or existing events', () => {
    expect(
      canToggleClinicalEvents({ isSubRow: false, hasEvents: false, canEditEvents: true })
    ).toBe(true);
    expect(
      canToggleClinicalEvents({ isSubRow: false, hasEvents: true, canEditEvents: false })
    ).toBe(true);
    expect(canToggleClinicalEvents({ isSubRow: true, hasEvents: true, canEditEvents: true })).toBe(
      false
    );
  });

  it('requires full event actions to render the events panel', () => {
    expect(
      shouldRenderClinicalEventsPanel({
        showEvents: true,
        canAdd: true,
        canUpdate: true,
        canDelete: true,
      })
    ).toBe(true);
    expect(
      shouldRenderClinicalEventsPanel({
        showEvents: true,
        canAdd: true,
        canUpdate: false,
        canDelete: true,
      })
    ).toBe(false);
  });

  it('prefers persisted medical observation entries and otherwise derives draft display entries', () => {
    const persistedEntry = {
      id: 'entry-1',
      specialty: Specialty.MEDICINA,
      note: 'Persistida',
    };
    expect(
      resolveMedicalObservationEntries({
        patient: buildPatient({ medicalHandoffEntries: [persistedEntry] as never }),
        isFieldReadOnly: false,
        hasCreatePrimaryEntryAction: false,
      })
    ).toEqual([persistedEntry]);

    const derivedEntries = resolveMedicalObservationEntries({
      patient: buildPatient({ medicalHandoffNote: 'Nota legada' } as never),
      isFieldReadOnly: false,
      hasCreatePrimaryEntryAction: false,
    });
    expect(derivedEntries).toHaveLength(1);

    expect(
      resolveMedicalObservationEntries({
        patient: buildPatient({ medicalHandoffNote: 'Nota legada' } as never),
        isFieldReadOnly: false,
        hasCreatePrimaryEntryAction: true,
      })
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          note: 'Nota legada',
        }),
      ])
    );
  });
});
