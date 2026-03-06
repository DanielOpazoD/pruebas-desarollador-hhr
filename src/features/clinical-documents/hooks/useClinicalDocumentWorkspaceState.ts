import { useEffect, useMemo, useRef, useState } from 'react';
import type { PatientData } from '@/types';
import type {
  ClinicalDocumentRecord,
  ClinicalDocumentTemplate,
} from '@/features/clinical-documents/domain/entities';
import { listActiveClinicalDocumentTemplates } from '@/features/clinical-documents/controllers/clinicalDocumentTemplateController';
import { buildClinicalDocumentEpisodeContext } from '@/features/clinical-documents/controllers/clinicalDocumentEpisodeController';
import {
  buildClinicalDocumentActor,
  hydrateLegacyClinicalDocument,
  serializeClinicalDocument,
} from '@/features/clinical-documents/controllers/clinicalDocumentWorkspaceController';
import { ClinicalDocumentRepository } from '@/services/repositories/ClinicalDocumentRepository';
import { ClinicalDocumentTemplateRepository } from '@/services/repositories/ClinicalDocumentTemplateRepository';
import { executePersistClinicalDocumentDraft } from '@/application/clinical-documents/clinicalDocumentUseCases';
import { validateClinicalDocument } from '@/features/clinical-documents/controllers/clinicalDocumentValidationController';

interface UseClinicalDocumentWorkspaceStateParams {
  patient: PatientData;
  currentDateString: string;
  bedId: string;
  isActive: boolean;
  canRead: boolean;
  canEdit: boolean;
  hospitalId: string;
  role: string;
  user: {
    uid?: string;
    email?: string | null;
    displayName?: string | null;
  } | null;
}

export const useClinicalDocumentWorkspaceState = ({
  patient,
  currentDateString,
  bedId,
  isActive,
  canRead,
  canEdit,
  hospitalId,
  role,
  user,
}: UseClinicalDocumentWorkspaceStateParams) => {
  const [templates, setTemplates] = useState<ClinicalDocumentTemplate[]>(
    listActiveClinicalDocumentTemplates()
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('epicrisis');
  const [documents, setDocuments] = useState<ClinicalDocumentRecord[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ClinicalDocumentRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const autosaveTimerRef = useRef<number | null>(null);
  const lastPersistedSnapshotRef = useRef<string>('');

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
        const hydrated = docs.map(document => hydrateLegacyClinicalDocument(document));
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
    const hydratedClone = cloned ? hydrateLegacyClinicalDocument(cloned) : null;
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
        const actor = buildClinicalDocumentActor(user, role);
        const result = await executePersistClinicalDocumentDraft(
          draft,
          hospitalId,
          actor,
          'autosave'
        );
        if (result.status === 'success' && result.data) {
          lastPersistedSnapshotRef.current = serializeClinicalDocument(result.data);
          setDraft(result.data);
        } else {
          console.error('[ClinicalDocumentsWorkspace] Autosave failed', result.issues[0]?.message);
        }
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

  const validationIssues = useMemo(() => (draft ? validateClinicalDocument(draft) : []), [draft]);

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

  return {
    templates,
    selectedTemplateId,
    setSelectedTemplateId,
    documents,
    selectedDocumentId,
    setSelectedDocumentId,
    draft,
    setDraft,
    isSaving,
    setIsSaving,
    episode,
    validationIssues,
    lastPersistedSnapshotRef,
    patchPatientField,
    patchSection,
    patchSectionTitle,
    patchDocumentTitle,
    patchPatientInfoTitle,
    patchFooterLabel,
    patchDocumentMeta,
  };
};
