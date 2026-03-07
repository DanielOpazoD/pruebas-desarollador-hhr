import type {
  ClinicalDocumentEpisodeContext,
  ClinicalDocumentRecord,
} from '@/features/clinical-documents/domain/entities';
import type { ConfirmOptions } from '@/context/uiContracts';

export const serializeClinicalDocument = (record: ClinicalDocumentRecord | null): string =>
  record ? JSON.stringify(record) : '';

const normalizeEpicrisisSections = (
  sections: ClinicalDocumentRecord['sections']
): ClinicalDocumentRecord['sections'] => {
  const sectionMap = new Map(sections.map(section => [section.id, section]));
  const antecedentes = sectionMap.get('antecedentes');
  const historia = sectionMap.get('historia-evolucion');
  const diagnosticos = sectionMap.get('diagnosticos');
  const plan = sectionMap.get('plan');
  const examenes = sectionMap.get('examenes-complementarios');

  const ordered: ClinicalDocumentRecord['sections'] = [];

  if (antecedentes) {
    ordered.push({ ...antecedentes, order: 0, title: antecedentes.title || 'Antecedentes' });
  }

  if (historia) {
    ordered.push({
      ...historia,
      order: 1,
      title: historia.title || 'Historia y evolución clínica',
    });
  }

  if (diagnosticos) {
    ordered.push({
      ...diagnosticos,
      order: 2,
      title:
        diagnosticos.title === 'Diagnósticos' || !diagnosticos.title
          ? 'Diagnósticos de egreso'
          : diagnosticos.title,
      visible: true,
    });
  } else {
    ordered.push({
      id: 'diagnosticos',
      title: 'Diagnósticos de egreso',
      content: '',
      order: 2,
      required: false,
      visible: true,
    });
  }

  if (plan) {
    ordered.push({
      ...plan,
      order: 3,
      title: plan.title === 'Plan' || !plan.title ? 'Indicaciones al alta' : plan.title,
    });
  }

  if (examenes) {
    ordered.push({ ...examenes, order: 4 });
  }

  const knownIds = new Set(ordered.map(section => section.id));
  const extras = sections
    .filter(section => !knownIds.has(section.id))
    .sort((left, right) => left.order - right.order);

  return [...ordered, ...extras].map((section, index) => ({
    ...section,
    order: section.order ?? index,
  }));
};

export const hydrateLegacyClinicalDocument = (
  record: ClinicalDocumentRecord
): ClinicalDocumentRecord => {
  const normalizedSections =
    record.documentType === 'epicrisis'
      ? normalizeEpicrisisSections(record.sections)
      : record.sections;

  return {
    ...record,
    sections: normalizedSections,
    patientInfoTitle: record.patientInfoTitle || 'Información del Paciente',
    footerMedicoLabel: record.footerMedicoLabel || 'Médico',
    footerEspecialidadLabel: record.footerEspecialidadLabel || 'Especialidad',
  };
};

export const formatClinicalDocumentDateTime = (isoString?: string): string => {
  if (!isoString) return '—';
  const value = new Date(isoString);
  return Number.isNaN(value.getTime())
    ? isoString
    : value.toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
};

export const getClinicalDocumentPatientFieldGridClass = (fieldId: string): string =>
  `clinical-document-patient-field stacked clinical-document-patient-field--${fieldId}`;

export const getClinicalDocumentPatientFieldLabel = (
  field: ClinicalDocumentRecord['patientFields'][number],
  documentType: ClinicalDocumentRecord['documentType']
): string => {
  if (documentType === 'epicrisis' && field.id === 'finf') {
    return 'Fecha de alta';
  }
  return field.label;
};

export const resizeClinicalDocumentSectionTextarea = (
  textarea: HTMLTextAreaElement | null
): void => {
  if (!textarea) return;
  textarea.style.height = 'auto';
  const minHeight = 92;
  textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
};

export const buildClinicalDocumentActor = (
  user: {
    uid?: string;
    email?: string | null;
    displayName?: string | null;
  } | null,
  role: string | null | undefined
) => ({
  uid: user?.uid || '',
  email: user?.email || '',
  displayName: user?.displayName || user?.email || 'Usuario',
  role: role || 'viewer',
});

export const buildClinicalDocumentPdfFileName = (record: ClinicalDocumentRecord): string =>
  `${record.title.replace(/\s+/g, '_')}_${record.patientRut.replace(/[.-]/g, '')}_${record.episodeKey}.pdf`;

export const buildClinicalDocumentWorkspaceNotifyPort = (
  success: (title: string, message?: string) => void,
  warning: (title: string, message?: string) => void,
  notifyError: (title: string, message?: string) => void,
  info: (title: string, message?: string) => void,
  confirm: (options: ConfirmOptions) => Promise<boolean>
) => ({
  success,
  warning,
  error: notifyError,
  info,
  confirm,
});

export type ClinicalDocumentWorkspaceEpisode = ClinicalDocumentEpisodeContext;
