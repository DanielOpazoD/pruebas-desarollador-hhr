import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FilePlus2, Printer, RotateCcw, Save, Trash2, UploadCloud } from 'lucide-react';
import clsx from 'clsx';

import '@/features/clinical-documents/styles/clinicalDocumentSheet.css';
import { useAuth } from '@/context/AuthContext';
import { useNotification } from '@/context/UIContext';
import { getActiveHospitalId } from '@/constants/firestorePaths';
import { ClinicalDocumentRepository } from '@/services/repositories/ClinicalDocumentRepository';
import { ClinicalDocumentTemplateRepository } from '@/services/repositories/ClinicalDocumentTemplateRepository';
import type { PatientData } from '@/types';
import type {
  ClinicalDocumentRecord,
  ClinicalDocumentTemplate,
} from '@/features/clinical-documents/domain/entities';
import { CLINICAL_DOCUMENT_BRANDING } from '@/features/clinical-documents/domain/branding';
import { createClinicalDocumentDraft } from '@/features/clinical-documents/domain/factories';
import {
  buildClinicalDocumentEpisodeContext,
  buildClinicalDocumentPatientFieldValues,
} from '@/features/clinical-documents/controllers/clinicalDocumentEpisodeController';
import {
  canDeleteClinicalDocuments,
  canEditClinicalDocuments,
  canReadClinicalDocuments,
  canSignClinicalDocument,
  canUnsignClinicalDocument,
} from '@/features/clinical-documents/controllers/clinicalDocumentPermissionController';
import { validateClinicalDocument } from '@/features/clinical-documents/controllers/clinicalDocumentValidationController';
import {
  getClinicalDocumentTypeLabel,
  listActiveClinicalDocumentTemplates,
} from '@/features/clinical-documents/controllers/clinicalDocumentTemplateController';
import { generateClinicalDocumentPdfBlob } from '@/features/clinical-documents/services/clinicalDocumentPdfService';
import { openClinicalDocumentBrowserPrintPreview } from '@/features/clinical-documents/services/clinicalDocumentPrintPdfService';
import { exportClinicalDocumentPdfViaBackend } from '@/features/clinical-documents/services/clinicalDocumentBackendExportService';
import { uploadClinicalDocumentPdfToDrive } from '@/features/clinical-documents/services/clinicalDocumentDriveService';

interface ClinicalDocumentsWorkspaceProps {
  patient: PatientData;
  currentDateString: string;
  bedId: string;
  isActive?: boolean;
}

interface InlineEditableTitleProps {
  value: string;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

const InlineEditableTitle: React.FC<InlineEditableTitleProps> = ({
  value,
  className,
  inputClassName,
  disabled = false,
  onChange,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value);

  useEffect(() => {
    if (!isEditing) {
      setDraftValue(value);
    }
  }, [isEditing, value]);

  const commit = () => {
    const normalized = draftValue.trim();
    onChange(normalized.length > 0 ? normalized : value);
    setIsEditing(false);
  };

  if (disabled) {
    return <span className={className}>{value}</span>;
  }

  if (isEditing) {
    return (
      <input
        value={draftValue}
        onChange={event => setDraftValue(event.target.value)}
        onBlur={commit}
        onKeyDown={event => {
          if (event.key === 'Enter') {
            event.preventDefault();
            commit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            setDraftValue(value);
            setIsEditing(false);
          }
        }}
        className={clsx('clinical-document-inline-title-input', inputClassName, className)}
        autoFocus
      />
    );
  }

  return (
    <button
      type="button"
      className={clsx('clinical-document-inline-title', className)}
      onClick={() => setIsEditing(true)}
      title="Haz clic para editar"
    >
      {value}
    </button>
  );
};

const serializeClinicalDocument = (record: ClinicalDocumentRecord | null): string =>
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

const hydrateLegacyDocument = (record: ClinicalDocumentRecord): ClinicalDocumentRecord => {
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

const formatDateTime = (isoString?: string): string => {
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

const shouldFallbackToLegacyDriveUpload = (error: unknown): boolean => {
  const code =
    typeof error === 'object' && error && 'code' in error
      ? String((error as { code?: string }).code || '')
      : '';
  return (
    code === 'functions/unimplemented' ||
    code === 'functions/not-found' ||
    code === 'functions/internal' ||
    code === 'functions/deadline-exceeded' ||
    code === 'functions/failed-precondition'
  );
};

const getPatientFieldGridClass = (fieldId: string): string => {
  return `clinical-document-patient-field stacked clinical-document-patient-field--${fieldId}`;
};

const getPatientFieldLabel = (
  field: ClinicalDocumentRecord['patientFields'][number],
  documentType: ClinicalDocumentRecord['documentType']
): string => {
  if (documentType === 'epicrisis' && field.id === 'finf') {
    return 'Fecha de alta';
  }
  return field.label;
};

const resizeSectionTextarea = (textarea: HTMLTextAreaElement | null): void => {
  if (!textarea) return;
  textarea.style.height = 'auto';
  const minHeight = 92;
  textarea.style.height = `${Math.max(textarea.scrollHeight, minHeight)}px`;
};

export const ClinicalDocumentsWorkspace: React.FC<ClinicalDocumentsWorkspaceProps> = ({
  patient,
  currentDateString,
  bedId,
  isActive = true,
}) => {
  const { user, role } = useAuth();
  const { success, warning, error: notifyError, info, confirm } = useNotification();
  const [templates, setTemplates] = useState<ClinicalDocumentTemplate[]>(
    listActiveClinicalDocumentTemplates()
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('epicrisis');
  const [documents, setDocuments] = useState<ClinicalDocumentRecord[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClinicalDocumentRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastPersistedSnapshotRef = useRef<string>('');

  const canRead = canReadClinicalDocuments(role);
  const canEdit = canEditClinicalDocuments(role);
  const canDelete = canDeleteClinicalDocuments(role);
  const hospitalId = getActiveHospitalId();
  const episode = useMemo(
    () => buildClinicalDocumentEpisodeContext(patient, currentDateString, bedId),
    [bedId, currentDateString, patient]
  );

  useEffect(() => {
    if (!templates.some(template => template.id === selectedTemplateId)) {
      setSelectedTemplateId(templates[0]?.id || 'epicrisis');
    }
  }, [selectedTemplateId, templates]);

  useEffect(() => {
    if (!isActive || !canRead) {
      return;
    }

    let cancelled = false;

    const loadTemplates = async () => {
      const remoteTemplates = await ClinicalDocumentTemplateRepository.listActive(hospitalId);
      if (!cancelled) {
        setTemplates(remoteTemplates);
      }
    };

    void loadTemplates();

    return () => {
      cancelled = true;
    };
  }, [canRead, hospitalId, isActive]);

  useEffect(() => {
    if (!isActive || role !== 'admin') {
      return;
    }

    if (templates.length > 0) {
      return;
    }

    void ClinicalDocumentTemplateRepository.seedDefaults(hospitalId)
      .then(() => ClinicalDocumentTemplateRepository.listActive(hospitalId))
      .then(seedTemplates => {
        setTemplates(seedTemplates);
      })
      .catch(error => {
        console.error('[ClinicalDocumentsWorkspace] Failed to seed templates:', error);
        setTemplates(listActiveClinicalDocumentTemplates());
      });
  }, [hospitalId, isActive, role, templates.length]);

  useEffect(() => {
    if (!isActive || !canRead) {
      return;
    }

    const unsubscribe = ClinicalDocumentRepository.subscribeByEpisode(
      episode.episodeKey,
      docs => {
        const hydrated = docs.map(document => hydrateLegacyDocument(document));
        setDocuments(hydrated);
        setSelectedDocumentId(prev => prev || hydrated[0]?.id || null);
      },
      hospitalId
    );

    return () => {
      unsubscribe();
    };
  }, [canRead, episode.episodeKey, hospitalId, isActive]);

  useEffect(() => {
    if (!selectedDocumentId) {
      setDraft(null);
      lastPersistedSnapshotRef.current = '';
      return;
    }
    const selected = documents.find(document => document.id === selectedDocumentId) || null;
    const cloned = selected ? structuredClone(selected) : null;
    const hydratedClone = cloned ? hydrateLegacyDocument(cloned) : null;
    setDraft(hydratedClone);
    lastPersistedSnapshotRef.current = serializeClinicalDocument(hydratedClone);
  }, [documents, selectedDocumentId]);

  useEffect(() => {
    if (!draft || !canEdit || draft.isLocked || !isActive || !user) {
      return;
    }

    const draftSnapshot = serializeClinicalDocument(draft);
    if (draftSnapshot === lastPersistedSnapshotRef.current) {
      return;
    }

    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
    }

    autosaveTimerRef.current = window.setTimeout(async () => {
      try {
        setIsSaving(true);
        const now = new Date().toISOString();
        const actor = {
          uid: user.uid,
          email: user.email || '',
          displayName: user.displayName || user.email || 'Usuario',
          role: role || 'viewer',
        };
        const nextDraft: ClinicalDocumentRecord = {
          ...draft,
          currentVersion: draft.currentVersion + 1,
          versionHistory: [
            ...draft.versionHistory,
            {
              version: draft.currentVersion + 1,
              savedAt: now,
              savedBy: actor,
              reason: 'autosave',
            },
          ],
          audit: {
            ...draft.audit,
            updatedAt: now,
            updatedBy: actor,
          },
        };
        const saved = await ClinicalDocumentRepository.saveDraft(nextDraft, hospitalId);
        lastPersistedSnapshotRef.current = serializeClinicalDocument(saved);
        setDraft(saved);
      } catch (error) {
        console.error('[ClinicalDocumentsWorkspace] Autosave failed', error);
      } finally {
        setIsSaving(false);
      }
    }, 900);

    return () => {
      if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [canEdit, draft, hospitalId, isActive, role, user]);

  const selectedDocument = draft;
  const canUnsignSelectedDocument =
    selectedDocument && user ? canUnsignClinicalDocument(role, selectedDocument) : false;
  const validationIssues = useMemo(
    () => (selectedDocument ? validateClinicalDocument(selectedDocument) : []),
    [selectedDocument]
  );

  const buildPdfFileName = (record: ClinicalDocumentRecord): string =>
    `${record.title.replace(/\s+/g, '_')}_${record.patientRut.replace(/[.\-]/g, '')}_${record.episodeKey}.pdf`;

  const createDocument = async () => {
    if (!canEdit || !user) {
      warning('Permiso insuficiente', 'No tienes permisos para crear documentos clínicos.');
      return;
    }

    const actor = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || user.email || 'Usuario',
      role: role || 'viewer',
    };

    try {
      const templateId = selectedTemplateId || templates[0]?.id || 'epicrisis';
      const record = createClinicalDocumentDraft({
        templateId,
        hospitalId,
        actor,
        episode,
        patientFieldValues: buildClinicalDocumentPatientFieldValues(patient),
        medico: actor.displayName,
        especialidad: episode.specialty || '',
      });

      const saved = await ClinicalDocumentRepository.createDraft(record, hospitalId);
      lastPersistedSnapshotRef.current = serializeClinicalDocument(saved);
      setSelectedDocumentId(saved.id);
      setDraft(saved);
      success(`${saved.title} creada`, 'Se generó el borrador inicial del documento.');
    } catch (creationError) {
      console.error('[ClinicalDocumentsWorkspace] Create document failed', creationError);
      notifyError(
        'No se pudo crear el documento',
        creationError instanceof Error
          ? creationError.message
          : 'Ocurrió un error al crear el borrador clínico.'
      );
    }
  };

  const handleDeleteDocument = async (document: ClinicalDocumentRecord) => {
    if (!canDelete) {
      warning('Permiso insuficiente', 'No tienes permisos para eliminar documentos clínicos.');
      return;
    }

    const confirmed = await confirm({
      title: 'Eliminar documento clínico',
      message:
        'Esta acción eliminará el documento de forma permanente.\n\nEscribe ELIMINAR para confirmar.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      variant: 'danger',
      requireInputConfirm: 'ELIMINAR',
    });

    if (!confirmed) return;

    try {
      await ClinicalDocumentRepository.delete(document.id, hospitalId);
      if (selectedDocumentId === document.id) {
        setSelectedDocumentId(null);
        setDraft(null);
        lastPersistedSnapshotRef.current = '';
      }
      success('Documento eliminado', `${document.title} fue eliminado correctamente.`);
    } catch (error) {
      console.error('[ClinicalDocumentsWorkspace] Delete failed', error);
      notifyError(
        'No se pudo eliminar',
        error instanceof Error ? error.message : 'Intenta nuevamente.'
      );
    }
  };

  const patchPatientField = (fieldId: string, value: string) => {
    setDraft(prev =>
      prev
        ? {
            ...prev,
            patientFields: prev.patientFields.map(field =>
              field.id === fieldId ? { ...field, value } : field
            ),
          }
        : prev
    );
  };

  const patchSection = (sectionId: string, content: string) => {
    setDraft(prev =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map(section =>
              section.id === sectionId ? { ...section, content } : section
            ),
          }
        : prev
    );
  };

  const patchSectionTitle = (sectionId: string, title: string) => {
    setDraft(prev =>
      prev
        ? {
            ...prev,
            sections: prev.sections.map(section =>
              section.id === sectionId ? { ...section, title } : section
            ),
          }
        : prev
    );
  };

  const patchDocumentTitle = (title: string) => {
    setDraft(prev => (prev ? { ...prev, title } : prev));
  };

  const patchPatientInfoTitle = (title: string) => {
    setDraft(prev => (prev ? { ...prev, patientInfoTitle: title } : prev));
  };

  const patchFooterLabel = (kind: 'medico' | 'especialidad', title: string) => {
    setDraft(prev =>
      prev
        ? kind === 'medico'
          ? { ...prev, footerMedicoLabel: title }
          : { ...prev, footerEspecialidadLabel: title }
        : prev
    );
  };

  const patchDocumentMeta = (
    patch: Partial<Pick<ClinicalDocumentRecord, 'medico' | 'especialidad'>>
  ) => {
    setDraft(prev => (prev ? { ...prev, ...patch } : prev));
  };

  const handleSaveNow = async () => {
    if (!selectedDocument || !canEdit || !user) return;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const actor = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email || 'Usuario',
        role: role || 'viewer',
      };
      const saved = await ClinicalDocumentRepository.saveDraft(
        {
          ...selectedDocument,
          currentVersion: selectedDocument.currentVersion + 1,
          versionHistory: [
            ...selectedDocument.versionHistory,
            {
              version: selectedDocument.currentVersion + 1,
              savedAt: now,
              savedBy: actor,
              reason: 'manual',
            },
          ],
          audit: {
            ...selectedDocument.audit,
            updatedAt: now,
            updatedBy: actor,
          },
        },
        hospitalId
      );
      lastPersistedSnapshotRef.current = serializeClinicalDocument(saved);
      setDraft(saved);
      success('Documento guardado', 'Los cambios se guardaron correctamente.');
    } catch (error) {
      console.error('[ClinicalDocumentsWorkspace] Save failed', error);
      notifyError('No se pudo guardar', 'Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    if (!selectedDocument) return;
    const opened = openClinicalDocumentBrowserPrintPreview(selectedDocument.title);
    if (!opened) {
      warning(
        'No se pudo abrir la vista de impresión',
        'Permite ventanas emergentes para usar la impresión PDF del navegador.'
      );
      return;
    }
    info(
      'Vista de impresión abierta',
      'Ajusta escala, márgenes y destino en el cuadro de impresión del navegador.'
    );
  };

  const handleSign = async () => {
    if (!selectedDocument || !user || !canSignClinicalDocument(role, selectedDocument)) {
      return;
    }
    if (validationIssues.length > 0) {
      warning('Documento incompleto', validationIssues[0]?.message);
      return;
    }
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const actor = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email || 'Usuario',
        role: role || 'viewer',
      };
      const signed = await ClinicalDocumentRepository.sign(
        {
          ...selectedDocument,
          status: 'signed',
          isLocked: true,
          currentVersion: selectedDocument.currentVersion + 1,
          versionHistory: [
            ...selectedDocument.versionHistory,
            {
              version: selectedDocument.currentVersion + 1,
              savedAt: now,
              savedBy: actor,
              reason: 'signature',
            },
          ],
          audit: {
            ...selectedDocument.audit,
            updatedAt: now,
            updatedBy: actor,
            signedAt: now,
            signedBy: actor,
          },
        },
        hospitalId
      );
      lastPersistedSnapshotRef.current = serializeClinicalDocument(signed);
      setDraft(signed);
      success('Documento firmado', `${signed.title} quedó cerrado y bloqueado.`);
    } catch (error) {
      console.error('[ClinicalDocumentsWorkspace] Sign failed', error);
      notifyError('No se pudo firmar', 'Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnsign = async () => {
    if (!selectedDocument || !user || !canUnsignClinicalDocument(role, selectedDocument)) {
      warning(
        'No se puede quitar la firma',
        'Solo se puede quitar firma de epicrisis firmadas el mismo día de emisión.'
      );
      return;
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const actor = {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || user.email || 'Usuario',
        role: role || 'viewer',
      };
      const unsigned = await ClinicalDocumentRepository.unsign(
        {
          ...selectedDocument,
          status: 'draft',
          isLocked: false,
          currentVersion: selectedDocument.currentVersion + 1,
          versionHistory: [
            ...selectedDocument.versionHistory,
            {
              version: selectedDocument.currentVersion + 1,
              savedAt: now,
              savedBy: actor,
              reason: 'unsign',
            },
          ],
          audit: {
            ...selectedDocument.audit,
            updatedAt: now,
            updatedBy: actor,
            unsignedAt: now,
            unsignedBy: actor,
            signatureRevocations: [
              ...(selectedDocument.audit.signatureRevocations || []),
              {
                revokedAt: now,
                revokedBy: actor,
                previousSignedAt: selectedDocument.audit.signedAt,
                reason: 'same_day_update',
              },
            ],
          },
        },
        hospitalId
      );
      lastPersistedSnapshotRef.current = serializeClinicalDocument(unsigned);
      setDraft(unsigned);
      success('Firma quitada', 'La epicrisis volvió a borrador con registro en auditoría.');
    } catch (error) {
      console.error('[ClinicalDocumentsWorkspace] Unsign failed', error);
      notifyError('No se pudo quitar la firma', 'Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadPdf = async () => {
    if (!selectedDocument || selectedDocument.status !== 'signed') {
      warning(
        'Documento no firmado',
        'Solo los documentos firmados pueden exportarse a Google Drive.'
      );
      return;
    }

    setIsUploadingPdf(true);
    try {
      const pdfBlob = await generateClinicalDocumentPdfBlob(selectedDocument);
      let result: { fileId: string; webViewLink: string; folderPath: string };

      try {
        const backendResult = await exportClinicalDocumentPdfViaBackend({
          documentId: selectedDocument.id,
          fileName: buildPdfFileName(selectedDocument),
          documentType: selectedDocument.documentType,
          patientName: selectedDocument.patientName,
          patientRut: selectedDocument.patientRut,
          episodeKey: selectedDocument.episodeKey,
          pdfBlob,
        });
        result = backendResult;
      } catch (backendError) {
        if (!shouldFallbackToLegacyDriveUpload(backendError)) {
          throw backendError;
        }

        result = await uploadClinicalDocumentPdfToDrive(
          pdfBlob,
          buildPdfFileName(selectedDocument),
          selectedDocument.documentType,
          selectedDocument.patientName,
          selectedDocument.patientRut,
          selectedDocument.episodeKey
        );
      }

      const exportedAt = new Date().toISOString();
      await ClinicalDocumentRepository.savePdfMetadata(
        selectedDocument.id,
        {
          fileId: result.fileId,
          webViewLink: result.webViewLink,
          folderPath: result.folderPath,
          exportedAt,
          exportStatus: 'exported',
        },
        hospitalId
      );
      setDraft(prev =>
        prev
          ? {
              ...prev,
              pdf: {
                fileId: result.fileId,
                webViewLink: result.webViewLink,
                folderPath: result.folderPath,
                exportedAt,
                exportStatus: 'exported',
              },
            }
          : prev
      );
      success('PDF exportado', 'El documento quedó respaldado en Google Drive.');
    } catch (error) {
      console.error('[ClinicalDocumentsWorkspace] Drive upload failed', error);
      if (selectedDocument) {
        await ClinicalDocumentRepository.savePdfMetadata(
          selectedDocument.id,
          {
            exportStatus: 'failed',
            exportError: error instanceof Error ? error.message : 'Error desconocido',
          },
          hospitalId
        );
        setDraft(prev =>
          prev
            ? {
                ...prev,
                pdf: {
                  ...prev.pdf,
                  exportStatus: 'failed',
                  exportError: error instanceof Error ? error.message : 'Error desconocido',
                },
              }
            : prev
        );
      }
      notifyError(
        'Falló la exportación',
        'El documento quedó guardado, pero el PDF no se pudo subir.'
      );
    } finally {
      setIsUploadingPdf(false);
    }
  };

  if (!canRead) {
    return (
      <p className="p-4 text-sm text-slate-600">No tienes permisos para acceder a este módulo.</p>
    );
  }

  return (
    <div className="grid grid-cols-[260px_minmax(0,1fr)] min-h-[72vh]">
      <aside className="border-r border-slate-200 bg-slate-50/70 p-3 space-y-3">
        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
            Nuevo documento
          </p>
          {!canEdit && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-800">
              Perfil en solo lectura: puedes revisar e imprimir, pero no crear nuevos documentos.
            </div>
          )}
          <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-2.5">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
                Tipo de documento
              </span>
              <select
                value={selectedTemplateId}
                onChange={event => setSelectedTemplateId(event.target.value)}
                className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-2 text-sm text-slate-800"
              >
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void createDocument()}
              disabled={!canEdit || !patient.patientName}
              className={clsx(
                'w-full rounded-lg border px-2.5 py-2 text-[11px] font-black uppercase tracking-wider transition-all',
                canEdit && patient.patientName
                  ? 'border-medical-300 bg-medical-50 text-medical-800 hover:bg-medical-100'
                  : 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
              )}
            >
              <FilePlus2 size={14} className="inline mr-2" />
              Crear documento
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
            Episodio actual
          </p>
          {documents.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-500">
              No hay documentos clínicos para este episodio.
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(document => (
                <div
                  key={document.id}
                  className={clsx(
                    'rounded-lg border bg-white px-2.5 py-2.5 transition-all',
                    selectedDocumentId === document.id
                      ? 'border-medical-300 bg-medical-50'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDocumentId(document.id)}
                      className="flex-1 text-left"
                    >
                      <span className="text-[13px] font-bold text-slate-800">{document.title}</span>
                      <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {getClinicalDocumentTypeLabel(document.documentType)}
                      </p>
                    </button>
                    <div className="flex items-center gap-1">
                      <span
                        className={clsx(
                          'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wider',
                          document.status === 'signed'
                            ? 'bg-emerald-100 text-emerald-700'
                            : document.status === 'ready_for_signature'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                        )}
                      >
                        {document.status === 'ready_for_signature'
                          ? 'Lista'
                          : document.status === 'signed'
                            ? 'Firmada'
                            : 'Borrador'}
                      </span>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => void handleDeleteDocument(document)}
                          className="rounded-md border border-red-200 p-1 text-red-600 hover:bg-red-50"
                          title="Eliminar documento"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {document.audit.updatedBy.displayName || 'Sin autor'} ·{' '}
                    {formatDateTime(document.audit.updatedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <section className="bg-[#f3f4f6] p-3 overflow-y-auto">
        {!selectedDocument ? (
          <div className="mx-auto max-w-4xl rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
            Selecciona o crea un documento clínico para comenzar.
          </div>
        ) : (
          <div className="mx-auto max-w-6xl space-y-3">
            <div className="flex flex-wrap items-center justify-end gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSaveNow}
                  disabled={!canEdit || selectedDocument.isLocked || isSaving}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  <Save size={14} className="inline mr-2" />
                  Guardar
                </button>
                <button
                  type="button"
                  onClick={handleSign}
                  disabled={!canSignClinicalDocument(role, selectedDocument)}
                  className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200"
                >
                  Firmar
                </button>
                {canUnsignSelectedDocument && (
                  <button
                    type="button"
                    onClick={() => void handleUnsign()}
                    disabled={isSaving}
                    className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:border-slate-200"
                  >
                    <RotateCcw size={14} className="inline mr-2" />
                    Quitar firma
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrint}
                  className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black uppercase tracking-widest text-slate-700 hover:bg-slate-50"
                >
                  <Printer size={14} className="inline mr-2" />
                  PDF
                </button>
                <button
                  type="button"
                  onClick={handleUploadPdf}
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
                    <label key={field.id} className={getPatientFieldGridClass(field.id)}>
                      <span className="clinical-document-patient-label">
                        {getPatientFieldLabel(field, selectedDocument.documentType)}
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
                          resizeSectionTextarea(event.currentTarget);
                        }}
                        readOnly={!canEdit || selectedDocument.isLocked}
                        rows={3}
                        ref={element => resizeSectionTextarea(element)}
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
        )}
      </section>
    </div>
  );
};
