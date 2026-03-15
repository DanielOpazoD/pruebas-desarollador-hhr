import { describe, expect, it } from 'vitest';
import type { MedicalHandoffEntry, PatientData } from '@/types';
import { PatientStatus, Specialty } from '@/types';
import {
  resolveMedicalEntryInlineMeta,
  resolveMedicalHandoffValidityViewModel,
  resolveMedicalObservationEntries,
} from '@/domain/handoff/patientView';

const buildEntry = (overrides: Partial<MedicalHandoffEntry> = {}): MedicalHandoffEntry => ({
  id: 'entry-1',
  specialty: Specialty.MEDICINA,
  note: 'Paciente estable',
  ...overrides,
});

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

describe('handoff patient view domain', () => {
  it('builds compact inline metadata for a medical entry', () => {
    const entry = buildEntry({
      updatedAt: '2026-03-03T20:33:00.000Z',
      updatedBy: {
        uid: 'doctor-1',
        displayName: 'Daniel Opazo Damiani',
        email: 'doctor@hospitalhangaroa.cl',
      },
    });

    expect(resolveMedicalEntryInlineMeta(entry)).toContain('Daniel Opazo');
    expect(resolveMedicalEntryInlineMeta(entry)).toContain('03-03-2026');
  });

  it('resolves validity state for updated and confirmed entries', () => {
    const updatedToday = resolveMedicalHandoffValidityViewModel(
      buildEntry({
        updatedAt: '2026-03-03T10:00:00.000Z',
        updatedBy: {
          uid: 'doctor-1',
          displayName: 'Doctor Test',
          email: 'doctor@hospitalhangaroa.cl',
        },
      }),
      '2026-03-03'
    );

    expect(updatedToday.statusLabel).toBe('Condición actual: actualizada hoy');
    expect(updatedToday.isActiveToday).toBe(true);

    const confirmedCurrent = resolveMedicalHandoffValidityViewModel(
      buildEntry({
        currentStatus: 'confirmed_current',
        currentStatusDate: '2026-03-03',
        currentStatusAt: '2026-03-03T11:00:00.000Z',
        currentStatusBy: {
          uid: 'admin-1',
          displayName: 'Admin Test',
          email: 'admin@hospitalhangaroa.cl',
        },
      }),
      '2026-03-03'
    );

    expect(confirmedCurrent.statusLabel).toBe('Condición actual: vigente, sin cambios');
    expect(confirmedCurrent.tooltipLabel).toContain('Admin Test');
    expect(confirmedCurrent.isMuted).toBe(false);
  });

  it('prefers persisted observation entries and otherwise derives draft entries', () => {
    const persistedEntry = buildEntry();
    expect(
      resolveMedicalObservationEntries({
        patient: buildPatient({ medicalHandoffEntries: [persistedEntry] as never }),
        isFieldReadOnly: false,
        hasCreatePrimaryEntryAction: false,
      })
    ).toEqual([persistedEntry]);

    expect(
      resolveMedicalObservationEntries({
        patient: buildPatient({ medicalHandoffNote: 'Nota legada' } as never),
        isFieldReadOnly: false,
        hasCreatePrimaryEntryAction: false,
      })
    ).toHaveLength(1);

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
