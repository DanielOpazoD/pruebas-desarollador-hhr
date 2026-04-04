import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ClinicalDocumentPatientInfoSection } from '@/features/clinical-documents/components/ClinicalDocumentPatientInfoSection';
import { createClinicalDocumentDraft } from '@/features/clinical-documents/domain/factories';

vi.mock('@/features/clinical-documents/components/InlineEditableTitle', () => ({
  InlineEditableTitle: ({
    value,
    onChange,
    onActivate,
    onDeactivate,
    disabled,
    className,
  }: {
    value: string;
    onChange: (value: string) => void;
    onActivate: () => void;
    onDeactivate: () => void;
    disabled?: boolean;
    className?: string;
  }) => (
    <div className={className}>
      <button type="button" onClick={onActivate} disabled={disabled}>
        activar-{value}
      </button>
      <button type="button" onClick={onDeactivate} disabled={disabled}>
        desactivar-{value}
      </button>
      <button type="button" onClick={() => onChange(`${value}-editado`)} disabled={disabled}>
        editar-{value}
      </button>
    </div>
  ),
}));

vi.mock('@/features/clinical-documents/controllers/clinicalDocumentWorkspaceController', () => ({
  getClinicalDocumentPatientFieldGridClass: (fieldId: string) => `grid-${fieldId}`,
  getClinicalDocumentPatientFieldLabel: (field: { label: string }) => field.label,
}));

const document = createClinicalDocumentDraft({
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
    admissionDate: '2026-03-10',
  },
  patientFieldValues: {
    nombre: 'Paciente Test',
    edad: '54',
  },
  medico: 'Doctor',
  especialidad: 'Medicina',
});

describe('ClinicalDocumentPatientInfoSection', () => {
  it('wires title, labels, values and visibility actions for editable fields', () => {
    const onSetActiveTitleTarget = vi.fn();
    const onPatchPatientInfoTitle = vi.fn();
    const onPatchPatientFieldLabel = vi.fn();
    const onPatchPatientField = vi.fn();
    const onSetPatientFieldVisibility = vi.fn();
    const visiblePatientFields = document.patientFields.slice(0, 2).map(field => ({
      ...field,
      visible: true,
      readonly: false,
    }));

    render(
      <ClinicalDocumentPatientInfoSection
        document={document}
        visiblePatientFields={visiblePatientFields}
        canEdit={true}
        activeTitleTarget={`field:${visiblePatientFields[0].id}`}
        onSetActiveTitleTarget={onSetActiveTitleTarget}
        onPatchPatientInfoTitle={onPatchPatientInfoTitle}
        onPatchPatientFieldLabel={onPatchPatientFieldLabel}
        onPatchPatientField={onPatchPatientField}
        onSetPatientFieldVisibility={onSetPatientFieldVisibility}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: `activar-${document.patientInfoTitle}` }));
    fireEvent.click(
      screen.getByRole('button', { name: `desactivar-${document.patientInfoTitle}` })
    );
    fireEvent.click(screen.getByRole('button', { name: `editar-${document.patientInfoTitle}` }));
    fireEvent.click(
      screen.getByRole('button', { name: `editar-${visiblePatientFields[0].label}` })
    );
    fireEvent.click(
      screen.getByRole('button', { name: `Eliminar campo ${visiblePatientFields[0].label}` })
    );
    fireEvent.change(screen.getByDisplayValue(visiblePatientFields[0].value), {
      target: { value: 'Nuevo valor' },
    });

    expect(onSetActiveTitleTarget).toHaveBeenCalledWith('patient-info-title');
    expect(onSetActiveTitleTarget).toHaveBeenCalledWith(expect.any(Function));
    expect(onPatchPatientInfoTitle).toHaveBeenCalledWith(`${document.patientInfoTitle}-editado`);
    expect(onPatchPatientFieldLabel).toHaveBeenCalledWith(
      visiblePatientFields[0].id,
      `${visiblePatientFields[0].label}-editado`
    );
    expect(onSetPatientFieldVisibility).toHaveBeenCalledWith(visiblePatientFields[0].id, false);
    expect(onPatchPatientField).toHaveBeenCalledWith(visiblePatientFields[0].id, 'Nuevo valor');
    expect(screen.getByDisplayValue(visiblePatientFields[1].value)).not.toHaveAttribute('readonly');
  });

  it('disables editing affordances when the document is locked or read only', () => {
    const lockedDocument = {
      ...document,
      isLocked: true,
    };

    render(
      <ClinicalDocumentPatientInfoSection
        document={lockedDocument}
        visiblePatientFields={[
          {
            ...lockedDocument.patientFields[0],
            readonly: true,
          },
        ]}
        canEdit={false}
        activeTitleTarget={null}
        onSetActiveTitleTarget={vi.fn()}
        onPatchPatientInfoTitle={vi.fn()}
        onPatchPatientFieldLabel={vi.fn()}
        onPatchPatientField={vi.fn()}
        onSetPatientFieldVisibility={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: `activar-${lockedDocument.patientInfoTitle}` })
    ).toBeDisabled();
    expect(screen.queryByRole('button', { name: /Eliminar campo/i })).not.toBeInTheDocument();
    expect(screen.getByDisplayValue(lockedDocument.patientFields[0].value)).toHaveAttribute(
      'readonly'
    );
  });
});
