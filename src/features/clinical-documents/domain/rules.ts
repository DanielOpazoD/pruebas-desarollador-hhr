import type {
  ClinicalDocumentPatientFieldTemplate,
  ClinicalDocumentSectionTemplate,
  ClinicalDocumentTemplate,
} from '@/features/clinical-documents/domain/entities';

export const CLINICAL_DOCUMENT_PATIENT_FIELDS: ClinicalDocumentPatientFieldTemplate[] = [
  { id: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Nombre Apellido' },
  { id: 'rut', label: 'Rut', type: 'text' },
  { id: 'edad', label: 'Edad', type: 'text', readonly: true, placeholder: 'años' },
  { id: 'fecnac', label: 'Fecha de nacimiento', type: 'date' },
  { id: 'fing', label: 'Fecha de ingreso', type: 'date' },
  { id: 'finf', label: 'Fecha del informe', type: 'date' },
  { id: 'hinf', label: 'Hora del informe', type: 'time' },
] as const;

export const CLINICAL_DOCUMENT_EPICRISIS_SECTIONS: ClinicalDocumentSectionTemplate[] = [
  { id: 'antecedentes', title: 'Antecedentes', order: 0, required: true, visible: true },
  {
    id: 'historia-evolucion',
    title: 'Historia y evolución clínica',
    order: 1,
    required: true,
    visible: true,
  },
  {
    id: 'examenes-complementarios',
    title: 'Exámenes complementarios',
    order: 2,
    required: false,
    visible: false,
  },
  { id: 'diagnosticos', title: 'Diagnósticos', order: 3, required: false, visible: false },
  { id: 'plan', title: 'Plan', order: 4, required: true, visible: true },
] as const;

export const CLINICAL_DOCUMENT_TEMPLATES: Record<string, ClinicalDocumentTemplate> = {
  epicrisis: {
    id: 'epicrisis',
    documentType: 'epicrisis',
    name: 'Epicrisis médica',
    title: 'Epicrisis médica',
    version: 1,
    patientFields: [...CLINICAL_DOCUMENT_PATIENT_FIELDS],
    sections: [...CLINICAL_DOCUMENT_EPICRISIS_SECTIONS],
    allowCustomTitle: false,
    allowAddSection: false,
    allowClinicalUpdateSections: false,
    status: 'active',
  },
} as const;

export const DEFAULT_CLINICAL_DOCUMENT_TEMPLATE_ID = 'epicrisis';
