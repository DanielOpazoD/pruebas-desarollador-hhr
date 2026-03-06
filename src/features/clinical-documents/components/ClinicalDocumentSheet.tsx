import React from 'react';
import { Printer, RotateCcw, Save, UploadCloud } from 'lucide-react';

import type { UserRole } from '@/types';
import type { ClinicalDocumentRecord } from '@/features/clinical-documents/domain/entities';
import { CLINICAL_DOCUMENT_BRANDING } from '@/features/clinical-documents/domain/branding';
import {
  getClinicalDocumentPatientFieldGridClass,
  getClinicalDocumentPatientFieldLabel,
  resizeClinicalDocumentSectionTextarea,
} from '@/features/clinical-documents/controllers/clinicalDocumentWorkspaceController';
import { canSignClinicalDocument } from '@/features/clinical-documents/controllers/clinicalDocumentPermissionController';
import { InlineEditableTitle } from '@/features/clinical-documents/components/InlineEditableTitle';

interface ClinicalDocumentSheetProps {
  selectedDocument: ClinicalDocumentRecord | null;
  canEdit: boolean;
  canUnsignSelectedDocument: boolean;
  role: UserRole | undefined;
  isSaving: boolean;
  isUploadingPdf: boolean;
  validationIssues: Array<{ message: string }>;
  onSave: () => void;
  onSign: () => void;
  onUnsign: () => void;
  onPrint: () => void;
  onUploadPdf: () => void;
  patchDocumentTitle: (title: string) => void;
  patchPatientInfoTitle: (title: string) => void;
  patchPatientField: (fieldId: string, value: string) => void;
  patchSectionTitle: (sectionId: string, title: string) => void;
  patchSection: (sectionId: string, content: string) => void;
  patchFooterLabel: (kind: 'medico' | 'especialidad', title: string) => void;
  patchDocumentMeta: (
    patch: Partial<Pick<ClinicalDocumentRecord, 'medico' | 'especialidad'>>
  ) => void;
}

export const ClinicalDocumentSheet: React.FC<ClinicalDocumentSheetProps> = ({
  selectedDocument,
  canEdit,
  canUnsignSelectedDocument,
  role,
  isSaving,
  isUploadingPdf,
  validationIssues,
  onSave,
  onSign,
  onUnsign,
  onPrint,
  onUploadPdf,
  patchDocumentTitle,
  patchPatientInfoTitle,
  patchPatientField,
  patchSectionTitle,
  patchSection,
  patchFooterLabel,
  patchDocumentMeta,
}) => {
  if (!selectedDocument) {
    return (
      <div className="mx-auto max-w-4xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
        Selecciona o crea un documento clínico para comenzar.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={!canEdit || selectedDocument.isLocked || isSaving}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
          >
            <Save size={14} className="inline mr-2" />
            Guardar
          </button>
          <button
            type="button"
            onClick={onSign}
            disabled={!canSignClinicalDocument(role, selectedDocument)}
            className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200"
          >
            Firmar
          </button>
          {canUnsignSelectedDocument && (
            <button
              type="button"
              onClick={onUnsign}
              disabled={isSaving}
              className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:border-slate-200"
            >
              <RotateCcw size={14} className="inline mr-2" />
              Quitar firma
            </button>
          )}
          <button
            type="button"
            onClick={onPrint}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
          >
            <Printer size={14} className="inline mr-2" />
            PDF
          </button>
          <button
            type="button"
            onClick={onUploadPdf}
            disabled={isUploadingPdf || selectedDocument.status !== 'signed'}
            className="rounded-xl border border-blue-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:border-slate-200"
          >
            <UploadCloud size={14} className="inline mr-2" />
            Drive
          </button>
        </div>
        {isSaving && (
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Guardando...
          </span>
        )}
      </div>

      {validationIssues.length > 0 && selectedDocument.status !== 'signed' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {validationIssues[0]?.message}
        </div>
      )}

      <div id="clinical-document-sheet" className="clinical-document-sheet">
        <div className="clinical-document-sheet-header">
          <img
            src={CLINICAL_DOCUMENT_BRANDING.leftLogoUrl}
            alt="Logo institucional izquierdo"
            className="clinical-document-sheet-logo"
          />
          <div className="clinical-document-title-wrap">
            <InlineEditableTitle
              value={selectedDocument.title}
              onChange={patchDocumentTitle}
              disabled={!canEdit || selectedDocument.isLocked}
              className="clinical-document-title"
            />
          </div>
          <img
            src={CLINICAL_DOCUMENT_BRANDING.rightLogoUrl}
            alt="Logo institucional derecho"
            className="clinical-document-sheet-logo justify-self-end"
          />
        </div>

        <div className="mb-3">
          <InlineEditableTitle
            value={selectedDocument.patientInfoTitle}
            onChange={patchPatientInfoTitle}
            disabled={!canEdit || selectedDocument.isLocked}
            className="clinical-document-section-title clinical-document-patient-info-title"
          />
          <div className="clinical-document-patient-grid">
            {selectedDocument.patientFields.map(field => (
              <label key={field.id} className={getClinicalDocumentPatientFieldGridClass(field.id)}>
                <span className="clinical-document-patient-label">
                  {getClinicalDocumentPatientFieldLabel(field, selectedDocument.documentType)}
                </span>
                <input
                  type={field.type}
                  value={field.value}
                  onChange={event => patchPatientField(field.id, event.target.value)}
                  readOnly={!canEdit || field.readonly || selectedDocument.isLocked}
                  className="clinical-document-input"
                />
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {selectedDocument.sections
            .filter(section => section.visible !== false)
            .sort((left, right) => left.order - right.order)
            .map(section => (
              <label key={section.id} className="block">
                <InlineEditableTitle
                  value={section.title}
                  onChange={title => patchSectionTitle(section.id, title)}
                  disabled={!canEdit || selectedDocument.isLocked}
                  className="clinical-document-section-title"
                />
                <textarea
                  value={section.content}
                  onChange={event => {
                    patchSection(section.id, event.target.value);
                    resizeClinicalDocumentSectionTextarea(event.currentTarget);
                  }}
                  readOnly={!canEdit || selectedDocument.isLocked}
                  rows={3}
                  ref={element => resizeClinicalDocumentSectionTextarea(element)}
                  className="clinical-document-textarea"
                />
              </label>
            ))}
        </div>

        <div className="clinical-document-footer">
          <label className="flex flex-col gap-1">
            <InlineEditableTitle
              value={selectedDocument.footerMedicoLabel}
              onChange={title => patchFooterLabel('medico', title)}
              disabled={!canEdit || selectedDocument.isLocked}
              className="clinical-document-section-title"
            />
            <input
              type="text"
              value={selectedDocument.medico}
              onChange={event => patchDocumentMeta({ medico: event.target.value })}
              readOnly={!canEdit || selectedDocument.isLocked}
              className="clinical-document-input"
            />
          </label>
          <label className="flex flex-col gap-1">
            <InlineEditableTitle
              value={selectedDocument.footerEspecialidadLabel}
              onChange={title => patchFooterLabel('especialidad', title)}
              disabled={!canEdit || selectedDocument.isLocked}
              className="clinical-document-section-title"
            />
            <input
              type="text"
              value={selectedDocument.especialidad}
              onChange={event => patchDocumentMeta({ especialidad: event.target.value })}
              readOnly={!canEdit || selectedDocument.isLocked}
              className="clinical-document-input"
            />
          </label>
        </div>
      </div>
    </div>
  );
};
