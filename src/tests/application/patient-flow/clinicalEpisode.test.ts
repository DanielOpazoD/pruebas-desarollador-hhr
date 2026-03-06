import { describe, expect, it } from 'vitest';
import { DataFactory } from '@/tests/factories/DataFactory';
import {
  buildClinicalEpisodeKey,
  buildPatientPresenceSnapshot,
  classifyPatientMovementForRecord,
  resolveClinicalEpisode,
} from '@/application/patient-flow/clinicalEpisode';

describe('clinicalEpisode application model', () => {
  it('builds a canonical episode key', () => {
    expect(buildClinicalEpisodeKey('12.345.678-9', '2026-03-05')).toBe('12.345.678-9__2026-03-05');
  });

  it('resolves a shared episode context from patient data', () => {
    const patient = DataFactory.createMockPatient('R1', {
      patientName: 'Paciente',
      rut: '11.111.111-1',
      admissionDate: '2026-03-05',
    });

    expect(
      resolveClinicalEpisode(patient, {
        sourceDailyRecordDate: '2026-03-06',
        sourceBedId: 'R1',
      })
    ).toMatchObject({
      patientRut: '11.111.111-1',
      patientName: 'Paciente',
      sourceDailyRecordDate: '2026-03-06',
      sourceBedId: 'R1',
      episodeKey: '11.111.111-1__2026-03-05',
    });
  });

  it('builds presence snapshots and movement classification with shared rules', () => {
    const patient = DataFactory.createMockPatient('R1', {
      rut: '11.111.111-1',
      admissionDate: '2026-03-05',
      admissionTime: '02:00',
    });

    expect(buildPatientPresenceSnapshot(patient, 'R1')).toMatchObject({
      bedId: 'R1',
      episodeKey: '11.111.111-1__2026-03-05',
    });
    expect(classifyPatientMovementForRecord('2026-03-05', patient).isNewAdmission).toBe(true);
  });
});
