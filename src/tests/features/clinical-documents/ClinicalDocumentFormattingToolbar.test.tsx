import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ClinicalDocumentFormattingToolbar } from '@/features/clinical-documents/components/ClinicalDocumentFormattingToolbar';
import { createClinicalDocumentDraft } from '@/features/clinical-documents/domain/factories';

const selectedDocument = createClinicalDocumentDraft({
  hospitalId: 'hhr',
  actor: {
    uid: 'user-1',
    email: 'doctor@example.com',
    displayName: 'Doctor',
    role: 'medico',
  },
  episode: {
    patientRut: '11.111.111-1',
    patientName: 'Paciente Test',
    episodeKey: 'episodio-1',
  },
  patientFieldValues: {},
  medico: 'Doctor',
  especialidad: 'Medicina',
});

describe('ClinicalDocumentFormattingToolbar', () => {
  it('renders formatting actions and delegates commands when formatting is open', () => {
    const onPrint = vi.fn();
    const onUploadPdf = vi.fn();
    const onRestoreTemplate = vi.fn();
    const onToggleFormatting = vi.fn();
    const onApplyFormatting = vi.fn();

    render(
      <ClinicalDocumentFormattingToolbar
        selectedDocument={selectedDocument}
        canEdit={true}
        isSaving={true}
        isUploadingPdf={false}
        formattingDisabled={false}
        isFormattingOpen={true}
        activeEditorHistoryState={{ canUndo: true, canRedo: true }}
        onPrint={onPrint}
        onUploadPdf={onUploadPdf}
        onRestoreTemplate={onRestoreTemplate}
        onToggleFormatting={onToggleFormatting}
        onApplyFormatting={onApplyFormatting}
      />
    );

    expect(screen.getByText('Guardando...')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Formato' }));
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }));
    fireEvent.click(screen.getByRole('button', { name: 'Drive' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reestablecer plantilla' }));
    fireEvent.click(screen.getByRole('button', { name: 'Negrita' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lista numerada' }));
    fireEvent.click(screen.getByRole('button', { name: 'Quitar formato' }));

    expect(onToggleFormatting).toHaveBeenCalledTimes(1);
    expect(onPrint).toHaveBeenCalledTimes(1);
    expect(onUploadPdf).toHaveBeenCalledTimes(1);
    expect(onRestoreTemplate).toHaveBeenCalledTimes(1);
    expect(onApplyFormatting).toHaveBeenCalledWith('bold');
    expect(onApplyFormatting).toHaveBeenCalledWith('insertOrderedList');
    expect(onApplyFormatting).toHaveBeenCalledWith('removeFormat');
  });

  it('shows exported drive state and disables controls when editing is unavailable', () => {
    render(
      <ClinicalDocumentFormattingToolbar
        selectedDocument={{
          ...selectedDocument,
          isLocked: true,
          pdf: {
            exportStatus: 'exported',
          },
        }}
        canEdit={false}
        isSaving={false}
        isUploadingPdf={true}
        formattingDisabled={true}
        isFormattingOpen={false}
        activeEditorHistoryState={{ canUndo: false, canRedo: false }}
        onPrint={vi.fn()}
        onUploadPdf={vi.fn()}
        onRestoreTemplate={vi.fn()}
        onToggleFormatting={vi.fn()}
        onApplyFormatting={vi.fn()}
      />
    );

    expect(screen.getByText('Guardado en Drive')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reestablecer plantilla' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Formato' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Guardado en Drive' })).toBeDisabled();
  });
});
