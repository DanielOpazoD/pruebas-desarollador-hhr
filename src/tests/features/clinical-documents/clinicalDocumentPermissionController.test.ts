import { describe, expect, it } from 'vitest';

import {
  canDeleteClinicalDocuments,
  canEditClinicalDocuments,
  canReadClinicalDocuments,
  canSignClinicalDocument,
  canUnsignClinicalDocument,
} from '@/features/clinical-documents/controllers/clinicalDocumentPermissionController';
import { createClinicalDocumentDraft } from '@/features/clinical-documents/domain/factories';
import { DataFactory } from '@/tests/factories/DataFactory';
import {
  buildClinicalDocumentEpisodeContext,
  buildClinicalDocumentPatientFieldValues,
} from '@/features/clinical-documents/controllers/clinicalDocumentEpisodeController';

describe('clinicalDocumentPermissionController', () => {
  const patient = DataFactory.createMockPatient('R1');
  const record = createClinicalDocumentDraft({
    hospitalId: 'h1',
    actor: {
      uid: 'u1',
      email: 'doctor@hospitalhangaroa.cl',
      displayName: 'Doctor Prueba',
      role: 'doctor_urgency',
    },
    episode: buildClinicalDocumentEpisodeContext(patient, '2026-03-04', 'R1'),
    patientFieldValues: buildClinicalDocumentPatientFieldValues(patient),
    medico: 'Doctor Prueba',
    especialidad: 'Medicina Interna',
  });

  it('allows read access for admin, doctor and nurse hospital', () => {
    expect(canReadClinicalDocuments('admin')).toBe(true);
    expect(canReadClinicalDocuments('doctor_urgency')).toBe(true);
    expect(canReadClinicalDocuments('nurse_hospital')).toBe(true);
    expect(canReadClinicalDocuments('editor')).toBe(true);
    expect(canReadClinicalDocuments('viewer')).toBe(false);
  });

  it('allows edit and sign only for admin and doctor roles', () => {
    expect(canEditClinicalDocuments('admin')).toBe(true);
    expect(canEditClinicalDocuments('doctor_urgency')).toBe(true);
    expect(canEditClinicalDocuments('nurse_hospital')).toBe(false);

    expect(canSignClinicalDocument('doctor_urgency', record)).toBe(true);
    expect(canSignClinicalDocument('nurse_hospital', record)).toBe(false);
    expect(canSignClinicalDocument('doctor_urgency', { ...record, status: 'signed' })).toBe(false);
  });

  it('allows document delete for editor and clinical roles', () => {
    expect(canDeleteClinicalDocuments('admin')).toBe(true);
    expect(canDeleteClinicalDocuments('doctor_urgency')).toBe(true);
    expect(canDeleteClinicalDocuments('nurse_hospital')).toBe(true);
    expect(canDeleteClinicalDocuments('editor')).toBe(true);
    expect(canDeleteClinicalDocuments('viewer')).toBe(false);
  });

  it('allows unsign only for signed epicrisis on same day and editable roles', () => {
    const signedToday = {
      ...record,
      documentType: 'epicrisis' as const,
      status: 'signed' as const,
      audit: {
        ...record.audit,
        signedAt: '2026-03-04T10:30:00.000Z',
      },
    };

    expect(
      canUnsignClinicalDocument('doctor_urgency', signedToday, new Date('2026-03-04T20:00:00.000Z'))
    ).toBe(true);
    expect(
      canUnsignClinicalDocument('nurse_hospital', signedToday, new Date('2026-03-04T20:00:00.000Z'))
    ).toBe(false);
    expect(
      canUnsignClinicalDocument('doctor_urgency', signedToday, new Date('2026-03-05T20:00:00.000Z'))
    ).toBe(false);
    expect(
      canUnsignClinicalDocument(
        'doctor_urgency',
        { ...signedToday, documentType: 'informe_medico' },
        new Date('2026-03-04T20:00:00.000Z')
      )
    ).toBe(false);
  });
});
