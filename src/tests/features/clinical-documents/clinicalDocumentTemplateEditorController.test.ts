import { describe, expect, it } from 'vitest';

import {
  createTemplatePatientField,
  createTemplateSection,
  normalizeTemplateForSave,
} from '@/features/clinical-documents/controllers/clinicalDocumentTemplateEditorController';
import { listActiveClinicalDocumentTemplates } from '@/features/clinical-documents/controllers/clinicalDocumentTemplateController';

describe('clinicalDocumentTemplateEditorController', () => {
  it('creates default section and patient field scaffolds', () => {
    const section = createTemplateSection(3);
    const field = createTemplatePatientField();

    expect(section.order).toBe(3);
    expect(section.visible).toBe(true);
    expect(field.type).toBe('text');
  });

  it('normalizes template metadata and reindexes sections', () => {
    const template = {
      ...listActiveClinicalDocumentTemplates()[0],
      name: '   ',
      title: '   ',
      sections: [
        { id: '', title: '  ', order: 7, required: true, visible: true },
        { id: 's2', title: 'Plan', order: 2, required: false, visible: false },
      ],
      patientFields: [
        { id: '', label: '', type: 'text' as const, readonly: false, placeholder: '' },
      ],
    };

    const normalized = normalizeTemplateForSave(template);

    expect(normalized.name).toBe('Plantilla clínica');
    expect(normalized.title).toBe('Documento clínico');
    expect(normalized.sections[0].order).toBe(0);
    expect(normalized.sections[0].title).toBe('Plan');
    expect(normalized.sections[1].order).toBe(1);
    expect(normalized.sections[1].title).toBe('Sección 2');
    expect(normalized.patientFields[0].id).toBe('field-1');
    expect(normalized.patientFields[0].label).toBe('Campo 1');
  });
});
