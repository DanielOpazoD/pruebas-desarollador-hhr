import { describe, expect, it } from 'vitest';

import { validateClinicalDocument } from '@/features/clinical-documents/controllers/clinicalDocumentValidationController';
import { createClinicalDocumentDraft } from '@/features/clinical-documents/domain/factories';
import { DataFactory } from '@/tests/factories/DataFactory';
import {
  buildClinicalDocumentEpisodeContext,
  buildClinicalDocumentPatientFieldValues,
} from '@/features/clinical-documents/controllers/clinicalDocumentEpisodeController';

describe('clinicalDocumentValidationController', () => {
  const patient = DataFactory.createMockPatient('R1');
  const actor = {
    uid: 'u1',
    email: 'doctor@hospitalhangaroa.cl',
    displayName: 'Doctor Prueba',
    role: 'doctor_urgency',
  };

  it('accepts a complete epicrisis draft', () => {
    const record = createClinicalDocumentDraft({
      hospitalId: 'h1',
      actor,
      episode: buildClinicalDocumentEpisodeContext(patient, '2026-03-04', 'R1'),
      patientFieldValues: buildClinicalDocumentPatientFieldValues(patient),
      medico: 'Dr Test',
      especialidad: 'Medicina Interna',
    });

    const complete = {
      ...record,
      sections: record.sections.map(section =>
        section.required ? { ...section, content: `${section.title} completo` } : section
      ),
    };

    expect(validateClinicalDocument(complete)).toEqual([]);
  });

  it('flags missing required patient fields and sections', () => {
    const record = createClinicalDocumentDraft({
      hospitalId: 'h1',
      actor,
      episode: buildClinicalDocumentEpisodeContext(patient, '2026-03-04', 'R1'),
      patientFieldValues: buildClinicalDocumentPatientFieldValues(patient),
      medico: '',
      especialidad: '',
    });

    const invalid = {
      ...record,
      patientFields: record.patientFields.map(field =>
        field.id === 'nombre' ? { ...field, value: '' } : field
      ),
    };

    const issues = validateClinicalDocument(invalid);

    expect(issues.some(issue => issue.path === 'patientFields.nombre')).toBe(true);
    expect(issues.some(issue => issue.path === 'medico')).toBe(true);
    expect(issues.some(issue => issue.path === 'especialidad')).toBe(true);
    expect(issues.some(issue => issue.path === 'sections.antecedentes')).toBe(true);
  });
});
