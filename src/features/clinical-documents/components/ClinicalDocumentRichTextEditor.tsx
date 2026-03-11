import React, { useRef } from 'react';
import clsx from 'clsx';

import type { ClinicalDocumentRichTextEditorActivationApi } from '@/features/clinical-documents/hooks/useClinicalDocumentRichTextEditorController';
import { useClinicalDocumentRichTextEditorController } from '@/features/clinical-documents/hooks/useClinicalDocumentRichTextEditorController';

interface ClinicalDocumentRichTextEditorProps {
  sectionId: string;
  sectionTitle: string;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onActivate?: (sectionId: string, editor: ClinicalDocumentRichTextEditorActivationApi) => void;
  onDeactivate?: (sectionId: string) => void;
}

export const ClinicalDocumentRichTextEditor: React.FC<ClinicalDocumentRichTextEditorProps> = ({
  sectionId,
  sectionTitle,
  value,
  disabled = false,
  onChange,
  onActivate,
  onDeactivate,
}) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const { handleActivateInteraction, handleBlur, handleInput, handleKeyDown } =
    useClinicalDocumentRichTextEditorController({
      sectionId,
      value,
      disabled,
      editorRef,
      onChange,
      onActivate,
      onDeactivate,
    });

  return (
    <div className="clinical-document-rich-text-wrap">
      <div
        ref={editorRef}
        contentEditable={!disabled}
        suppressContentEditableWarning
        role="textbox"
        aria-label={`Contenido ${sectionTitle}`}
        data-section-editor={sectionId}
        className={clsx(
          'clinical-document-textarea clinical-document-rich-text-editor',
          disabled && 'is-readonly'
        )}
        onInput={handleInput}
        onFocus={handleActivateInteraction}
        onMouseUp={handleActivateInteraction}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};
