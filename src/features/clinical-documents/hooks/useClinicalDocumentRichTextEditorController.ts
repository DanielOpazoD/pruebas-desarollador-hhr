import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, MutableRefObject } from 'react';

import type { ClinicalDocumentFormattingCommand } from '@/features/clinical-documents/components/clinicalDocumentSheetShared';
import {
  applyClinicalDocumentEditorCommand,
  normalizeClinicalDocumentContentForStorage,
} from '@/features/clinical-documents/controllers/clinicalDocumentRichTextController';

export type ClinicalDocumentRichTextEditorCommand =
  | ClinicalDocumentFormattingCommand
  | 'foreColor'
  | 'hiliteColor';

export interface ClinicalDocumentRichTextEditorActivationApi {
  element: HTMLDivElement | null;
  canUndo: boolean;
  canRedo: boolean;
  applyCommand: (command: ClinicalDocumentRichTextEditorCommand, value?: string) => void;
}

interface UseClinicalDocumentRichTextEditorControllerParams {
  sectionId: string;
  value: string;
  disabled: boolean;
  editorRef: MutableRefObject<HTMLDivElement | null>;
  onChange: (value: string) => void;
  onActivate?: (sectionId: string, editor: ClinicalDocumentRichTextEditorActivationApi) => void;
  onDeactivate?: (sectionId: string) => void;
}

export const useClinicalDocumentRichTextEditorController = ({
  sectionId,
  value,
  disabled,
  editorRef,
  onChange,
  onActivate,
  onDeactivate,
}: UseClinicalDocumentRichTextEditorControllerParams) => {
  const historyRef = useRef<string[]>([]);
  const historyIndexRef = useRef(-1);
  const isApplyingHistoryRef = useRef(false);
  const isActiveRef = useRef(false);
  const lastLocalNormalizedValueRef = useRef('');
  const onActivateRef = useRef(onActivate);
  const onDeactivateRef = useRef(onDeactivate);
  const applyEditorCommandRef = useRef<
    ((command: ClinicalDocumentRichTextEditorCommand, value?: string) => void) | null
  >(null);
  const normalizedValue = useMemo(() => normalizeClinicalDocumentContentForStorage(value), [value]);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });

  useEffect(() => {
    onActivateRef.current = onActivate;
    onDeactivateRef.current = onDeactivate;
  }, [onActivate, onDeactivate]);

  const updateHistoryState = useCallback(
    (nextIndex = historyIndexRef.current, history = historyRef.current) => {
      setHistoryState({
        canUndo: nextIndex > 0,
        canRedo: nextIndex >= 0 && nextIndex < history.length - 1,
      });
    },
    []
  );

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const currentNormalizedHtml = normalizeClinicalDocumentContentForStorage(editor.innerHTML);
    const isFocused = typeof document !== 'undefined' && document.activeElement === editor;
    const isLocalEcho = normalizedValue === lastLocalNormalizedValueRef.current;

    if (currentNormalizedHtml !== normalizedValue && (!isFocused || !isLocalEcho)) {
      editor.innerHTML = normalizedValue;
    }

    if (!isApplyingHistoryRef.current && (!isFocused || !isLocalEcho)) {
      historyRef.current = [normalizedValue];
      historyIndexRef.current = 0;
      updateHistoryState(0, historyRef.current);
    }

    isApplyingHistoryRef.current = false;
  }, [editorRef, normalizedValue, updateHistoryState]);

  const pushHistorySnapshot = useCallback(
    (html: string) => {
      const normalizedHtml = normalizeClinicalDocumentContentForStorage(html);
      const current = historyRef.current[historyIndexRef.current];

      if (normalizedHtml === current) {
        return;
      }

      historyRef.current = [
        ...historyRef.current.slice(0, historyIndexRef.current + 1),
        normalizedHtml,
      ];
      historyIndexRef.current = historyRef.current.length - 1;
      updateHistoryState();
    },
    [updateHistoryState]
  );

  const applyEditorCommand = useCallback(
    (command: ClinicalDocumentRichTextEditorCommand, value?: string) => {
      const editor = editorRef.current;
      if (!editor || disabled) return;

      if (command === 'undo') {
        if (historyIndexRef.current <= 0) return;
        historyIndexRef.current -= 1;
        const previous = historyRef.current[historyIndexRef.current] || '';
        isApplyingHistoryRef.current = true;
        editor.innerHTML = previous;
        updateHistoryState();
        lastLocalNormalizedValueRef.current = previous;
        onChange(previous);
        return;
      }

      if (command === 'redo') {
        if (historyIndexRef.current >= historyRef.current.length - 1) return;
        historyIndexRef.current += 1;
        const next = historyRef.current[historyIndexRef.current] || '';
        isApplyingHistoryRef.current = true;
        editor.innerHTML = next;
        updateHistoryState();
        lastLocalNormalizedValueRef.current = next;
        onChange(next);
        return;
      }

      editor.focus();
      applyClinicalDocumentEditorCommand(command, value);
      const html = normalizeClinicalDocumentContentForStorage(editor.innerHTML);
      lastLocalNormalizedValueRef.current = html;
      pushHistorySnapshot(html);
      onChange(html);
    },
    [disabled, editorRef, onChange, pushHistorySnapshot, updateHistoryState]
  );

  useEffect(() => {
    applyEditorCommandRef.current = applyEditorCommand;
  }, [applyEditorCommand]);

  const buildActivationApi = useCallback(
    (nextHistory = historyState): ClinicalDocumentRichTextEditorActivationApi => ({
      element: editorRef.current,
      canUndo: nextHistory.canUndo,
      canRedo: nextHistory.canRedo,
      applyCommand: (command, value) => applyEditorCommandRef.current?.(command, value),
    }),
    [editorRef, historyState]
  );

  const notifyActive = useCallback(
    (nextHistory = historyState) => {
      isActiveRef.current = true;
      onActivateRef.current?.(sectionId, buildActivationApi(nextHistory));
    },
    [buildActivationApi, historyState, sectionId]
  );

  useEffect(() => {
    if (!isActiveRef.current) {
      return;
    }

    onActivateRef.current?.(sectionId, buildActivationApi());
  }, [buildActivationApi, historyState.canRedo, historyState.canUndo, sectionId]);

  const handleInput = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    const html = normalizeClinicalDocumentContentForStorage(editor.innerHTML);
    lastLocalNormalizedValueRef.current = html;
    pushHistorySnapshot(html);
    onChange(html);
  }, [editorRef, onChange, pushHistorySnapshot]);

  const handleActivateInteraction = useCallback(() => {
    notifyActive();
  }, [notifyActive]);

  const handleBlur = useCallback(() => {
    isActiveRef.current = false;
    onDeactivateRef.current?.(sectionId);
  }, [sectionId]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!editorRef.current || disabled) return;

      const isPrimaryModifier = event.metaKey || event.ctrlKey;

      if (isPrimaryModifier && event.key.toLowerCase() === 'b') {
        event.preventDefault();
        applyEditorCommand('bold');
      }
      if (isPrimaryModifier && event.key.toLowerCase() === 'i') {
        event.preventDefault();
        applyEditorCommand('italic');
      }
      if (isPrimaryModifier && event.key.toLowerCase() === 'u') {
        event.preventDefault();
        applyEditorCommand('underline');
      }
      if (isPrimaryModifier && event.shiftKey && event.key.toLowerCase() === '7') {
        event.preventDefault();
        applyEditorCommand('insertOrderedList');
      }
      if (isPrimaryModifier && event.key.toLowerCase() === 'z' && event.shiftKey) {
        event.preventDefault();
        applyEditorCommand('redo');
      } else if (isPrimaryModifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        applyEditorCommand('undo');
      }
      if (event.key === 'Tab') {
        event.preventDefault();
        applyEditorCommand(event.shiftKey ? 'outdent' : 'indent');
      }
    },
    [applyEditorCommand, disabled, editorRef]
  );

  return {
    handleActivateInteraction,
    handleBlur,
    handleInput,
    handleKeyDown,
  };
};
