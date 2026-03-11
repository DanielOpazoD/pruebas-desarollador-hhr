import { useEffect } from 'react';
import type { Dispatch, MutableRefObject } from 'react';

import {
  resolveClinicalDocumentDraftLoad,
  type ClinicalDocumentDraftLoadResolution,
} from '@/application/clinical-documents/clinicalDocumentEditorUseCases';
import type { ClinicalDocumentRecord } from '@/features/clinical-documents/domain/entities';
import type {
  ClinicalDocumentDraftAction,
  ClinicalDocumentDraftBaseState,
} from '@/features/clinical-documents/hooks/clinicalDocumentDraftReducer';

interface UseClinicalDocumentDraftRemoteSyncParams {
  documents: ClinicalDocumentRecord[];
  selectedDocumentId: string | null;
  hasPendingRemoteUpdate: boolean;
  pendingRemoteState: ClinicalDocumentDraftBaseState;
  dispatch: Dispatch<ClinicalDocumentDraftAction>;
  draftRef: MutableRefObject<ClinicalDocumentRecord | null>;
  draftDirtyRef: MutableRefObject<boolean>;
  baseStateRef: MutableRefObject<ClinicalDocumentDraftBaseState>;
}

const applyDraftLoadResolution = (
  resolution: ClinicalDocumentDraftLoadResolution,
  dispatch: Dispatch<ClinicalDocumentDraftAction>
) => {
  if (resolution.kind === 'clear') {
    dispatch({ type: 'LOAD_DOCUMENT', document: null, snapshot: '' });
    return;
  }

  if (resolution.kind === 'preserve') {
    return;
  }

  if (resolution.kind === 'stage_remote') {
    dispatch({
      type: 'REMOTE_UPDATE_RECEIVED',
      document: resolution.document,
      snapshot: resolution.snapshot,
    });
    return;
  }

  dispatch({
    type: 'LOAD_DOCUMENT',
    document: resolution.document,
    snapshot: resolution.snapshot,
  });
};

export const useClinicalDocumentDraftRemoteSync = ({
  documents,
  selectedDocumentId,
  hasPendingRemoteUpdate,
  pendingRemoteState,
  dispatch,
  draftRef,
  draftDirtyRef,
  baseStateRef,
}: UseClinicalDocumentDraftRemoteSyncParams) => {
  useEffect(() => {
    const resolution = resolveClinicalDocumentDraftLoad({
      documents,
      selectedDocumentId,
      currentDraft: draftRef.current,
      baseState: baseStateRef.current,
      hasLocalDraftChanges: draftDirtyRef.current,
    });

    applyDraftLoadResolution(resolution, dispatch);
  }, [baseStateRef, dispatch, documents, draftDirtyRef, draftRef, selectedDocumentId]);

  useEffect(() => {
    if (!hasPendingRemoteUpdate || draftDirtyRef.current) {
      return;
    }

    if (!pendingRemoteState.document || !pendingRemoteState.snapshot) {
      return;
    }

    dispatch({ type: 'APPLY_REMOTE_UPDATE' });
  }, [
    dispatch,
    draftDirtyRef,
    hasPendingRemoteUpdate,
    pendingRemoteState.document,
    pendingRemoteState.snapshot,
  ]);
};
