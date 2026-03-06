import { useCallback, useState } from 'react';
import type { PatientData } from '@/types';
import type { UserRole } from '@/types';
import type { ConfirmOptions } from '@/context/uiContracts';
import type {
  ClinicalDocumentEpisodeContext,
  ClinicalDocumentRecord,
} from '@/features/clinical-documents/domain/entities';
import { createClinicalDocumentDraft } from '@/features/clinical-documents/domain/factories';
import { buildClinicalDocumentPatientFieldValues } from '@/features/clinical-documents/controllers/clinicalDocumentEpisodeController';
import {
  buildClinicalDocumentActor,
  buildClinicalDocumentPdfFileName,
  serializeClinicalDocument,
} from '@/features/clinical-documents/controllers/clinicalDocumentWorkspaceController';
import {
  canSignClinicalDocument,
  canUnsignClinicalDocument,
} from '@/features/clinical-documents/controllers/clinicalDocumentPermissionController';
import { openClinicalDocumentBrowserPrintPreview } from '@/features/clinical-documents/services/clinicalDocumentPrintPdfService';
import {
  executeCreateClinicalDocumentDraft,
  executeDeleteClinicalDocument,
  executeExportClinicalDocumentPdf,
  executePersistClinicalDocumentDraft,
  executeSignClinicalDocument,
  executeUnsignClinicalDocument,
} from '@/application/clinical-documents/clinicalDocumentUseCases';

interface NotificationPort {
  success: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface UseClinicalDocumentWorkspaceActionsParams {
  patient: PatientData;
  role: UserRole | undefined;
  user: {
    uid?: string;
    email?: string | null;
    displayName?: string | null;
  } | null;
  hospitalId: string;
  episode: ClinicalDocumentEpisodeContext;
  selectedTemplateId: string;
  templates: Array<{ id: string }>;
  selectedDocument: ClinicalDocumentRecord | null;
  selectedDocumentId: string | null;
  canEdit: boolean;
  canDelete: boolean;
  validationIssues: Array<{ message: string }>;
  notify: NotificationPort;
  setSelectedDocumentId: (documentId: string | null) => void;
  setDraft: React.Dispatch<React.SetStateAction<ClinicalDocumentRecord | null>>;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  lastPersistedSnapshotRef: React.MutableRefObject<string>;
}

export const useClinicalDocumentWorkspaceActions = ({
  patient,
  role,
  user,
  hospitalId,
  episode,
  selectedTemplateId,
  templates,
  selectedDocument,
  selectedDocumentId,
  canEdit,
  canDelete,
  validationIssues,
  notify,
  setSelectedDocumentId,
  setDraft,
  setIsSaving,
  lastPersistedSnapshotRef,
}: UseClinicalDocumentWorkspaceActionsParams) => {
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);

  const createDocument = useCallback(async () => {
    if (!canEdit || !user) {
      notify.warning('Permiso insuficiente', 'No tienes permisos para crear documentos clínicos.');
      return;
    }

    try {
      const actor = buildClinicalDocumentActor(user, role);
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

      const result = await executeCreateClinicalDocumentDraft(record, hospitalId);
      if (result.status !== 'success' || !result.data) {
        throw new Error(result.issues[0]?.message || 'No se pudo crear el documento clínico.');
      }
      lastPersistedSnapshotRef.current = serializeClinicalDocument(result.data);
      setSelectedDocumentId(result.data.id);
      setDraft(result.data);
      notify.success(`${result.data.title} creada`, 'Se generó el borrador inicial del documento.');
    } catch (error) {
      console.error('[ClinicalDocumentsWorkspace] Create document failed', error);
      notify.error(
        'No se pudo crear el documento',
        error instanceof Error ? error.message : 'Ocurrió un error al crear el borrador clínico.'
      );
    }
  }, [
    canEdit,
    user,
    notify,
    role,
    selectedTemplateId,
    templates,
    hospitalId,
    episode,
    patient,
    lastPersistedSnapshotRef,
    setSelectedDocumentId,
    setDraft,
  ]);

  const handleDeleteDocument = useCallback(
    async (document: ClinicalDocumentRecord) => {
      if (!canDelete) {
        notify.warning(
          'Permiso insuficiente',
          'No tienes permisos para eliminar documentos clínicos.'
        );
        return;
      }

      const confirmed = await notify.confirm({
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
        const result = await executeDeleteClinicalDocument(document.id, hospitalId);
        if (result.status !== 'success') {
          throw new Error(result.issues[0]?.message || 'No se pudo eliminar el documento.');
        }
        if (selectedDocumentId === document.id) {
          setSelectedDocumentId(null);
          setDraft(null);
          lastPersistedSnapshotRef.current = '';
        }
        notify.success('Documento eliminado', `${document.title} fue eliminado correctamente.`);
      } catch (error) {
        console.error('[ClinicalDocumentsWorkspace] Delete failed', error);
        notify.error(
          'No se pudo eliminar',
          error instanceof Error ? error.message : 'Intenta nuevamente.'
        );
      }
    },
    [
      canDelete,
      notify,
      hospitalId,
      selectedDocumentId,
      setSelectedDocumentId,
      setDraft,
      lastPersistedSnapshotRef,
    ]
  );

  const handleSaveNow = useCallback(async () => {
    if (!selectedDocument || !canEdit || !user) return;
    setIsSaving(true);
    try {
      const actor = buildClinicalDocumentActor(user, role);
      const result = await executePersistClinicalDocumentDraft(
        selectedDocument,
        hospitalId,
        actor,
        'manual'
      );
      if (result.status !== 'success' || !result.data) {
        throw new Error(result.issues[0]?.message || 'No se pudo guardar el documento.');
      }
      lastPersistedSnapshotRef.current = serializeClinicalDocument(result.data);
      setDraft(result.data);
      notify.success('Documento guardado', 'Los cambios se guardaron correctamente.');
    } catch (error) {
      console.error('[ClinicalDocumentsWorkspace] Save failed', error);
      notify.error('No se pudo guardar', 'Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedDocument,
    canEdit,
    user,
    setIsSaving,
    role,
    hospitalId,
    lastPersistedSnapshotRef,
    setDraft,
    notify,
  ]);

  const handlePrint = useCallback(() => {
    if (!selectedDocument) return;
    const opened = openClinicalDocumentBrowserPrintPreview(selectedDocument.title);
    if (!opened) {
      notify.warning(
        'No se pudo abrir la vista de impresión',
        'Permite ventanas emergentes para usar la impresión PDF del navegador.'
      );
      return;
    }
    notify.info(
      'Vista de impresión abierta',
      'Ajusta escala, márgenes y destino en el cuadro de impresión del navegador.'
    );
  }, [selectedDocument, notify]);

  const handleSign = useCallback(async () => {
    if (!selectedDocument || !user || !canSignClinicalDocument(role, selectedDocument)) {
      return;
    }
    if (validationIssues.length > 0) {
      notify.warning('Documento incompleto', validationIssues[0]?.message);
      return;
    }
    setIsSaving(true);
    try {
      const actor = buildClinicalDocumentActor(user, role);
      const result = await executeSignClinicalDocument(selectedDocument, hospitalId, actor);
      if (result.status !== 'success' || !result.data) {
        throw new Error(result.issues[0]?.message || 'No se pudo firmar el documento.');
      }
      lastPersistedSnapshotRef.current = serializeClinicalDocument(result.data);
      setDraft(result.data);
      notify.success('Documento firmado', `${result.data.title} quedó cerrado y bloqueado.`);
    } catch (error) {
      console.error('[ClinicalDocumentsWorkspace] Sign failed', error);
      notify.error('No se pudo firmar', 'Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedDocument,
    user,
    role,
    validationIssues,
    notify,
    setIsSaving,
    hospitalId,
    lastPersistedSnapshotRef,
    setDraft,
  ]);

  const handleUnsign = useCallback(async () => {
    if (!selectedDocument || !user || !canUnsignClinicalDocument(role, selectedDocument)) {
      notify.warning(
        'No se puede quitar la firma',
        'Solo se puede quitar firma de epicrisis firmadas el mismo día de emisión.'
      );
      return;
    }

    setIsSaving(true);
    try {
      const actor = buildClinicalDocumentActor(user, role);
      const result = await executeUnsignClinicalDocument(selectedDocument, hospitalId, actor);
      if (result.status !== 'success' || !result.data) {
        throw new Error(result.issues[0]?.message || 'No se pudo quitar la firma.');
      }
      lastPersistedSnapshotRef.current = serializeClinicalDocument(result.data);
      setDraft(result.data);
      notify.success('Firma quitada', 'La epicrisis volvió a borrador con registro en auditoría.');
    } catch (error) {
      console.error('[ClinicalDocumentsWorkspace] Unsign failed', error);
      notify.error('No se pudo quitar la firma', 'Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  }, [
    selectedDocument,
    user,
    role,
    notify,
    setIsSaving,
    hospitalId,
    lastPersistedSnapshotRef,
    setDraft,
  ]);

  const handleUploadPdf = useCallback(async () => {
    if (!selectedDocument || selectedDocument.status !== 'signed') {
      notify.warning(
        'Documento no firmado',
        'Solo los documentos firmados pueden exportarse a Google Drive.'
      );
      return;
    }

    setIsUploadingPdf(true);
    try {
      const result = await executeExportClinicalDocumentPdf({
        record: selectedDocument,
        hospitalId,
        fileName: buildClinicalDocumentPdfFileName(selectedDocument),
      });
      if (result.status !== 'success' || !result.data) {
        throw new Error(result.issues[0]?.message || 'No se pudo exportar el PDF clínico.');
      }
      setDraft(prev => (prev ? { ...prev, pdf: result.data!.pdf } : prev));
      notify.success('PDF exportado', 'El documento quedó respaldado en Google Drive.');
    } catch (error) {
      console.error('[ClinicalDocumentsWorkspace] Drive upload failed', error);
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
      notify.error(
        'Falló la exportación',
        'El documento quedó guardado, pero el PDF no se pudo subir.'
      );
    } finally {
      setIsUploadingPdf(false);
    }
  }, [selectedDocument, notify, hospitalId, setDraft]);

  return {
    createDocument,
    handleDeleteDocument,
    handleSaveNow,
    handlePrint,
    handleSign,
    handleUnsign,
    handleUploadPdf,
    isUploadingPdf,
  };
};
