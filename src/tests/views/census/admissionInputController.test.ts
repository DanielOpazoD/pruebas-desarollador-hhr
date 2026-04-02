import { describe, expect, it } from 'vitest';
import {
  resolveAdmissionDateChange,
  resolveAdmissionDateAudit,
  resolveAdmissionDateMax,
  resolveAdmissionDateIsEditable,
  resolveIsCriticalAdmissionEmpty,
} from '@/features/census/controllers/admissionInputController';

describe('admissionInputController', () => {
  it('detects critical admission empty when patient exists and date is missing', () => {
    expect(resolveIsCriticalAdmissionEmpty('Paciente', '')).toBe(true);
    expect(resolveIsCriticalAdmissionEmpty('Paciente', '2026-02-15')).toBe(false);
    expect(resolveIsCriticalAdmissionEmpty('', '')).toBe(false);
  });

  it('auto-fills time when date is set and time is missing', () => {
    const resolution = resolveAdmissionDateChange({
      nextDate: '2026-02-15',
      currentAdmissionTime: '',
      now: new Date('2026-02-15T06:42:00'),
    });

    expect(resolution.shouldPatchMultiple).toBe(true);
    expect(resolution.admissionDate).toBe('2026-02-15');
    expect(resolution.admissionTime).toBe('06:42');
  });

  it('keeps single-field change when admission time already exists', () => {
    const resolution = resolveAdmissionDateChange({
      nextDate: '2026-02-15',
      currentAdmissionTime: '05:30',
      now: new Date('2026-02-15T06:42:00'),
    });

    expect(resolution.shouldPatchMultiple).toBe(false);
    expect(resolution.admissionDate).toBe('2026-02-15');
    expect(resolution.admissionTime).toBeUndefined();
  });

  it('returns provided max date fallback', () => {
    expect(resolveAdmissionDateMax('2026-02-15')).toBe('2026-02-15');
  });

  it('suggests the current clinical day window for suspicious admissions', () => {
    const audit = resolveAdmissionDateAudit({
      recordDate: '2026-03-10',
      admissionDate: '2024-01-01',
      admissionTime: '10:30',
    });

    expect(audit.isSuspicious).toBe(true);
    expect(audit.candidateDates).toEqual(['2026-03-10', '2026-03-11']);
    expect(audit.suggestedAdmissionDate).toBe('2026-03-10');
    expect(audit.message).toContain('ventana esperada');
  });

  it('accepts the next day for madrugada admissions', () => {
    const audit = resolveAdmissionDateAudit({
      recordDate: '2026-03-10',
      admissionDate: '2026-03-11',
      admissionTime: '02:15',
    });

    expect(audit.isSuspicious).toBe(false);
    expect(audit.suggestedAdmissionDate).toBe('2026-03-11');
  });

  it('only allows editing on the first observed census day', () => {
    expect(
      resolveAdmissionDateIsEditable({
        recordDate: '2026-03-10',
        firstSeenDate: '2026-03-10',
        isNewAdmission: true,
      })
    ).toBe(true);

    expect(
      resolveAdmissionDateIsEditable({
        recordDate: '2026-03-11',
        firstSeenDate: '2026-03-10',
        isNewAdmission: false,
      })
    ).toBe(false);
  });

  it('falls back to admission classification when firstSeenDate is missing', () => {
    expect(
      resolveAdmissionDateIsEditable({
        recordDate: '2026-03-10',
        isNewAdmission: true,
      })
    ).toBe(true);

    expect(
      resolveAdmissionDateIsEditable({
        recordDate: '2026-03-11',
        isNewAdmission: false,
      })
    ).toBe(false);
  });
});
