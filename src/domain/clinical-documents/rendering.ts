import type { ClinicalDocumentRecord } from '@/domain/clinical-documents/entities';
import { createClinicalDocumentHash } from '@/domain/clinical-documents/hash';
import { stripClinicalDocumentHtmlToText } from '@/domain/clinical-documents/richText';

export const buildClinicalDocumentRenderedText = (
  record: Pick<
    ClinicalDocumentRecord,
    | 'title'
    | 'patientInfoTitle'
    | 'patientFields'
    | 'sections'
    | 'footerMedicoLabel'
    | 'footerEspecialidadLabel'
    | 'medico'
    | 'especialidad'
  >
): string => {
  const patientBlock = record.patientFields
    .filter(field => field.visible !== false)
    .map(field => `${field.label}: ${field.value || '—'}`)
    .join('\n');
  const sectionsBlock = record.sections
    .filter(section => section.visible !== false)
    .map(
      section =>
        `${section.title}\n${stripClinicalDocumentHtmlToText(section.content) || 'Sin contenido registrado.'}`
    )
    .join('\n\n');

  return [
    record.title,
    record.patientInfoTitle || 'Información del Paciente',
    patientBlock,
    sectionsBlock,
    `${record.footerMedicoLabel || 'Médico'}: ${record.medico || '—'}`,
    `${record.footerEspecialidadLabel || 'Especialidad'}: ${record.especialidad || '—'}`,
  ]
    .filter(Boolean)
    .join('\n\n')
    .trim();
};

export const buildClinicalDocumentIntegrityHash = (
  record: Pick<
    ClinicalDocumentRecord,
    | 'title'
    | 'patientInfoTitle'
    | 'patientFields'
    | 'sections'
    | 'footerMedicoLabel'
    | 'footerEspecialidadLabel'
    | 'medico'
    | 'especialidad'
  >
): string => createClinicalDocumentHash(buildClinicalDocumentRenderedText(record));
