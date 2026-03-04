import { describe, expect, it, vi } from 'vitest';

import {
  buildClinicalDocumentEpisodeContext,
  buildClinicalDocumentPatientFieldValues,
  buildClinicalEpisodeKey,
  getCurrentDateValue,
  getCurrentTimeValue,
} from '@/features/clinical-documents/controllers/clinicalDocumentEpisodeController';
import { DataFactory } from '@/tests/factories/DataFactory';

describe('clinicalDocumentEpisodeController', () => {
  it('builds a stable episode key from rut and admission date', () => {
    expect(buildClinicalEpisodeKey('12.345.678-9', '2026-03-04')).toBe('12.345.678-9__2026-03-04');
  });

  it('builds a patient episode context from census data', () => {
    const patient = DataFactory.createMockPatient('R1');
    const context = buildClinicalDocumentEpisodeContext(patient, '2026-03-04', 'R1');

    expect(context.patientRut).toBe(patient.rut);
    expect(context.patientName).toBe(patient.patientName);
    expect(context.sourceDailyRecordDate).toBe('2026-03-04');
    expect(context.sourceBedId).toBe('R1');
    expect(context.episodeKey).toContain(patient.rut);
  });

  it('prefills clinical document patient fields from the patient record', () => {
    const patient = DataFactory.createMockPatient('R1');
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-04T13:45:00.000Z'));

    const values = buildClinicalDocumentPatientFieldValues(patient);

    expect(values.nombre).toBe(patient.patientName);
    expect(values.rut).toBe(patient.rut);
    expect(values.fing).toBe(patient.admissionDate || '');
    expect(values.finf).toBe(getCurrentDateValue());
    expect(values.hinf).toBe(getCurrentTimeValue());
    vi.useRealTimers();
  });
});
