import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { PatientActionMenu } from '@/features/census/components/patient-row/PatientActionMenu';

describe('PatientActionMenu', () => {
  it('keeps the demographics icon visible for specialist access without opening demographics', () => {
    const onViewDemographics = vi.fn();

    render(
      <PatientActionMenu
        isBlocked={false}
        readOnly={true}
        accessProfile="specialist"
        hasClinicalDocument={true}
        isNewAdmission={false}
        onAction={vi.fn()}
        onViewDemographics={onViewDemographics}
        onViewClinicalDocuments={vi.fn()}
        onViewExamRequest={vi.fn()}
        onViewImagingRequest={vi.fn()}
      />
    );

    const demographicsButton = screen.getByTitle('Datos del Paciente');
    expect(demographicsButton).toBeInTheDocument();

    fireEvent.click(demographicsButton);
    expect(onViewDemographics).not.toHaveBeenCalled();
  });
});
