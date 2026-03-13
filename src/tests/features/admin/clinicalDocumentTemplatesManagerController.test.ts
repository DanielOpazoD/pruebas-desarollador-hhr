import { describe, expect, it } from 'vitest';

import {
  addClinicalDocumentTemplateField,
  addClinicalDocumentTemplateSection,
  patchClinicalDocumentTemplate,
  removeClinicalDocumentTemplateSection,
} from '@/features/admin/components/clinicalDocumentTemplatesManagerState';
import type { ClinicalDocumentTemplate } from '@/features/clinical-documents';

const baseTemplate: ClinicalDocumentTemplate = {
  id: 'epicrisis',
  name: 'Epicrisis',
  title: 'Epicrisis médica',
  documentType: 'epicrisis',
  status: 'active',
  version: 1,
  allowCustomTitle: false,
  allowAddSection: true,
  allowClinicalUpdateSections: false,
  defaultPatientInfoTitle: 'Información del paciente',
  defaultFooterMedicoLabel: 'Médico',
  defaultFooterEspecialidadLabel: 'Especialidad',
  patientFields: [],
  sections: [
    {
      id: 'history',
      title: 'Historia',
      order: 0,
      visible: true,
      required: true,
    },
    {
      id: 'plan',
      title: 'Plan',
      order: 1,
      visible: true,
      required: false,
    },
  ],
};

describe('clinicalDocumentTemplatesManagerController', () => {
  it('patches root template fields immutably', () => {
    const result = patchClinicalDocumentTemplate([baseTemplate], 'epicrisis', {
      title: 'Epicrisis quirúrgica',
    });

    expect(result[0]?.title).toBe('Epicrisis quirúrgica');
    expect(baseTemplate.title).toBe('Epicrisis médica');
  });

  it('adds patient fields and sections using the shared template factories', () => {
    const withField = addClinicalDocumentTemplateField([baseTemplate], 'epicrisis');
    const withSection = addClinicalDocumentTemplateSection(withField, 'epicrisis');

    expect(withField[0]?.patientFields).toHaveLength(1);
    expect(withSection[0]?.sections).toHaveLength(3);
  });

  it('reorders remaining sections after removing one', () => {
    const result = removeClinicalDocumentTemplateSection([baseTemplate], 'epicrisis', 'history');

    expect(result[0]?.sections.map(section => ({ id: section.id, order: section.order }))).toEqual([
      { id: 'plan', order: 0 },
    ]);
  });
});
