import { describe, expect, it } from 'vitest';
import type { MedicalHandoffEntry } from '@/types/domain/patient';
import {
  resolveMedicalEntryMetadataViewModel,
  resolveMedicalHandoffValidityViewModel,
} from '@/domain/handoff/patientView';

const buildEntry = (overrides: Partial<MedicalHandoffEntry> = {}): MedicalHandoffEntry => ({
  id: 'entry-1',
  specialty: 'Med Interna',
  note: 'Paciente estable',
  ...overrides,
});

describe('medical patient handoff render domain', () => {
  it('builds compact metadata for a current note without dual detail', () => {
    const entry = buildEntry({
      originalNoteAt: '2026-03-03T20:33:00.000Z',
      originalNoteBy: {
        uid: 'doctor-1',
        displayName: 'Daniel Opazo Damiani',
        email: 'doctor@hospitalhangaroa.cl',
      },
      updatedAt: '2026-03-03T20:33:00.000Z',
      updatedBy: {
        uid: 'doctor-1',
        displayName: 'Daniel Opazo Damiani',
        email: 'doctor@hospitalhangaroa.cl',
      },
    });
    const metadata = resolveMedicalEntryMetadataViewModel(entry, '2026-03-03');

    expect(metadata.primaryLabel).toContain('Daniel Opazo');
    expect(metadata.showInfoButton).toBe(false);
  });

  it('builds dual metadata when the current mark was made by another user', () => {
    const entry = buildEntry({
      originalNoteAt: '2026-03-02T20:33:00.000Z',
      originalNoteBy: {
        uid: 'doctor-1',
        displayName: 'Daniel Opazo Damiani',
        email: 'doctor@hospitalhangaroa.cl',
      },
      updatedAt: '2026-03-03T10:00:00.000Z',
      updatedBy: {
        uid: 'admin-1',
        displayName: 'Admin Test',
        email: 'admin@hospitalhangaroa.cl',
      },
      currentStatus: 'updated_by_specialist',
      currentStatusDate: '2026-03-03',
      currentStatusAt: '2026-03-03T10:00:00.000Z',
      currentStatusBy: {
        uid: 'admin-1',
        displayName: 'Admin Test',
        email: 'admin@hospitalhangaroa.cl',
      },
    });
    const metadata = resolveMedicalEntryMetadataViewModel(entry, '2026-03-03');

    expect(metadata.primaryLabel).toContain('Nota base: Daniel Opazo');
    expect(metadata.printLabel).toContain('Vigente por: Admin Test');
    expect(metadata.showInfoButton).toBe(true);
  });

  it('resolves inline note status for updated and legacy confirmed entries', () => {
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

    expect(updatedToday.statusLabel).toBe('Nota vigente');
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

    expect(confirmedCurrent.statusLabel).toBe('Nota vigente');
    expect(confirmedCurrent.isActiveToday).toBe(true);
    expect(confirmedCurrent.isMuted).toBe(false);
  });
});
