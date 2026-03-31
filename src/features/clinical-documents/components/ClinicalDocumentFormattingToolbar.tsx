import React from 'react';
import {
  Bold,
  CheckCircle2,
  Eraser,
  IndentDecrease,
  IndentIncrease,
  Italic,
  List,
  ListOrdered,
  Printer,
  Redo2,
  SquarePen,
  Underline,
  Undo2,
  UploadCloud,
} from 'lucide-react';

import type {
  ClinicalDocumentFormattingCommand,
  ClinicalDocumentSheetProps,
} from '@/features/clinical-documents/components/clinicalDocumentSheetShared';

interface ClinicalDocumentFormattingToolbarProps {
  selectedDocument: NonNullable<ClinicalDocumentSheetProps['selectedDocument']>;
  canEdit: boolean;
  isSaving: boolean;
  isUploadingPdf: boolean;
  formattingDisabled: boolean;
  isFormattingOpen: boolean;
  activeEditorHistoryState: { canUndo: boolean; canRedo: boolean };
  onPrint: () => void;
  onUploadPdf: () => void;
  onRestoreTemplate: () => void;
  onToggleFormatting: () => void;
  onApplyFormatting: (command: ClinicalDocumentFormattingCommand) => void;
}

const formattingActions = [
  { command: 'bold' as const, label: 'Negrita', icon: Bold },
  { command: 'italic' as const, label: 'Cursiva', icon: Italic },
  { command: 'underline' as const, label: 'Subrayado', icon: Underline },
  { command: 'insertUnorderedList' as const, label: 'Viñetas', icon: List },
  { command: 'insertOrderedList' as const, label: 'Lista numerada', icon: ListOrdered },
  { command: 'indent' as const, label: 'Aumentar sangría', icon: IndentIncrease },
  { command: 'outdent' as const, label: 'Disminuir sangría', icon: IndentDecrease },
  { command: 'removeFormat' as const, label: 'Quitar formato', icon: Eraser },
  { command: 'undo' as const, label: 'Deshacer', icon: Undo2 },
  { command: 'redo' as const, label: 'Rehacer', icon: Redo2 },
];

export const ClinicalDocumentFormattingToolbar: React.FC<
  ClinicalDocumentFormattingToolbarProps
> = ({
  selectedDocument,
  canEdit,
  isSaving,
  isUploadingPdf,
  formattingDisabled,
  isFormattingOpen,
  activeEditorHistoryState,
  onPrint,
  onUploadPdf,
  onRestoreTemplate,
  onToggleFormatting,
  onApplyFormatting,
}) => {
  const driveExported = selectedDocument.pdf?.exportStatus === 'exported';
  const formattingReady = canEdit && !selectedDocument.isLocked && !formattingDisabled;
  const iconButtonClass =
    'relative inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-transparent px-0 py-0">
      <span
        className={`min-w-[84px] text-[10px] font-bold uppercase tracking-[0.16em] ${
          isSaving ? 'text-slate-400' : 'text-transparent select-none'
        }`}
        aria-live="polite"
      >
        Guardando...
      </span>
      <div className="relative flex flex-wrap items-center justify-end gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onPrint}
          className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-700 hover:bg-slate-50"
        >
          <Printer size={13} className="mr-1.5 inline" />
          PDF
        </button>
        <button
          type="button"
          onClick={onUploadPdf}
          disabled={isUploadingPdf}
          className={`inline-flex h-8 items-center rounded-lg px-2.5 text-[10px] font-black uppercase tracking-[0.16em] disabled:cursor-not-allowed disabled:text-slate-300 disabled:border-slate-200 ${
            driveExported
              ? 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
              : 'border border-blue-200 text-blue-700 hover:bg-blue-50'
          }`}
        >
          {driveExported ? (
            <CheckCircle2 size={13} className="mr-1.5 inline" />
          ) : (
            <UploadCloud size={13} className="mr-1.5 inline" />
          )}
          {driveExported ? 'Guardado en Drive' : 'Drive'}
        </button>
        <button
          type="button"
          onClick={onRestoreTemplate}
          disabled={!canEdit || selectedDocument.isLocked}
          aria-label="Reestablecer plantilla"
          title="Reestablecer plantilla"
          className={`${iconButtonClass} border-amber-200 text-amber-700 hover:bg-amber-50`}
        >
          <SquarePen size={13} />
        </button>
        <button
          type="button"
          onClick={onToggleFormatting}
          disabled={!canEdit || selectedDocument.isLocked}
          aria-pressed={isFormattingOpen}
          aria-label="Formato"
          title="Formato"
          className={`${iconButtonClass} transition-colors ${
            formattingReady
              ? 'border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100'
              : 'border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span
            aria-hidden="true"
            className={`absolute mt-[-16px] mr-[-16px] h-1.5 w-1.5 rounded-full ${
              formattingReady ? 'bg-sky-500' : 'bg-slate-300'
            }`}
          />
          <Bold size={13} />
        </button>
        {isFormattingOpen && (
          <div
            className={`clinical-document-global-toolbar-modal ${
              formattingReady ? 'clinical-document-global-toolbar-modal--ready' : ''
            }`}
          >
            <div
              className="clinical-document-toolbar"
              role="toolbar"
              aria-label="Formato global del documento"
            >
              {formattingActions.map(action => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.command}
                    type="button"
                    className="clinical-document-toolbar-button"
                    onMouseDown={event => event.preventDefault()}
                    onClick={() => onApplyFormatting(action.command)}
                    disabled={
                      formattingDisabled ||
                      (action.command === 'undo' && !activeEditorHistoryState.canUndo) ||
                      (action.command === 'redo' && !activeEditorHistoryState.canRedo)
                    }
                    aria-label={action.label}
                    title={action.label}
                  >
                    <Icon size={14} />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
