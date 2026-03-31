import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PatientRowOrbitalQuickActions } from '@/features/census/components/patient-row/PatientRowOrbitalQuickActions';

const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      matches,
      media: '(hover: hover) and (pointer: fine)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
};

describe('PatientRowOrbitalQuickActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMatchMedia(true);
  });

  it('opens the orbital launcher and dispatches each clinical callback', () => {
    const onViewClinicalDocuments = vi.fn();
    const onViewExamRequest = vi.fn();
    const onViewImagingRequest = vi.fn();

    render(
      <table>
        <tbody>
          <tr className="group/patient-row" data-testid="patient-row">
            <td className="relative">
              <PatientRowOrbitalQuickActions
                showClinicalDocumentsAction={true}
                showExamRequestAction={true}
                showImagingRequestAction={true}
                onViewClinicalDocuments={onViewClinicalDocuments}
                onViewExamRequest={onViewExamRequest}
                onViewImagingRequest={onViewImagingRequest}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );

    fireEvent.mouseEnter(screen.getByTestId('patient-row'));
    fireEvent.click(screen.getByRole('button', { name: /acciones clínicas rápidas/i }));
    fireEvent.click(screen.getByRole('button', { name: /documentos clínicos/i }));
    expect(onViewClinicalDocuments).toHaveBeenCalledTimes(1);

    fireEvent.mouseEnter(screen.getByTestId('patient-row'));
    fireEvent.click(screen.getByRole('button', { name: /acciones clínicas rápidas/i }));
    fireEvent.click(screen.getByRole('button', { name: /solicitud exámenes/i }));
    expect(onViewExamRequest).toHaveBeenCalledTimes(1);

    fireEvent.mouseEnter(screen.getByTestId('patient-row'));
    fireEvent.click(screen.getByRole('button', { name: /acciones clínicas rápidas/i }));
    fireEvent.click(screen.getByRole('button', { name: /solicitud de imágenes/i }));
    expect(onViewImagingRequest).toHaveBeenCalledTimes(1);
  });

  it('closes when clicking the invisible backdrop', async () => {
    render(
      <table>
        <tbody>
          <tr className="group/patient-row" data-testid="patient-row">
            <td className="relative">
              <PatientRowOrbitalQuickActions
                showClinicalDocumentsAction={true}
                showExamRequestAction={false}
                showImagingRequestAction={false}
                onViewClinicalDocuments={vi.fn()}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );

    fireEvent.mouseEnter(screen.getByTestId('patient-row'));
    fireEvent.click(screen.getByRole('button', { name: /acciones clínicas rápidas/i }));
    expect(screen.getByRole('button', { name: /documentos clínicos/i })).toBeInTheDocument();

    const backdrop = document.querySelector('.fixed.inset-0.z-40');
    if (!backdrop) {
      throw new Error('Backdrop not found');
    }
    fireEvent.click(backdrop);

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /documentos clínicos/i })
      ).not.toBeInTheDocument();
    });
  });

  it('keeps the trigger visible on touch-like devices', () => {
    mockMatchMedia(false);

    render(
      <table>
        <tbody>
          <tr className="group/patient-row" data-testid="patient-row">
            <td className="relative">
              <PatientRowOrbitalQuickActions
                showClinicalDocumentsAction={true}
                showExamRequestAction={true}
                showImagingRequestAction={true}
                onViewClinicalDocuments={vi.fn()}
                onViewExamRequest={vi.fn()}
                onViewImagingRequest={vi.fn()}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );

    const trigger = screen.getByRole('button', { name: /acciones clínicas rápidas/i });
    expect(trigger.className).toContain('opacity-100');
  });

  it('reveals the trigger while hovering the patient row on desktop pointers', async () => {
    render(
      <table>
        <tbody>
          <tr className="group/patient-row" data-testid="patient-row">
            <td className="relative">
              <PatientRowOrbitalQuickActions
                showClinicalDocumentsAction={true}
                showExamRequestAction={true}
                showImagingRequestAction={true}
                onViewClinicalDocuments={vi.fn()}
                onViewExamRequest={vi.fn()}
                onViewImagingRequest={vi.fn()}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );

    const trigger = screen.getByRole('button', { name: /acciones clínicas rápidas/i });
    expect(trigger.className).toContain('opacity-0');

    fireEvent.mouseEnter(screen.getByTestId('patient-row'));

    await waitFor(() => {
      expect(trigger.className).toContain('opacity-100');
    });
  });

  it('keeps other launchers hidden while one row launcher is open', async () => {
    render(
      <table>
        <tbody>
          <tr className="group/patient-row" data-testid="patient-row" data-bed-id="R2">
            <td className="relative">
              <PatientRowOrbitalQuickActions
                showClinicalDocumentsAction={true}
                showExamRequestAction={true}
                showImagingRequestAction={true}
                onViewClinicalDocuments={vi.fn()}
                onViewExamRequest={vi.fn()}
                onViewImagingRequest={vi.fn()}
              />
            </td>
          </tr>
          <tr className="group/patient-row" data-testid="patient-row-secondary" data-bed-id="R3">
            <td className="relative">
              <PatientRowOrbitalQuickActions
                showClinicalDocumentsAction={true}
                showExamRequestAction={true}
                showImagingRequestAction={true}
                onViewClinicalDocuments={vi.fn()}
                onViewExamRequest={vi.fn()}
                onViewImagingRequest={vi.fn()}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );

    const triggers = screen.getAllByRole('button', { name: /acciones clínicas rápidas/i });
    fireEvent.mouseEnter(screen.getByTestId('patient-row'));
    fireEvent.click(triggers[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /documentos clínicos/i })).toBeInTheDocument();
    });

    fireEvent.mouseEnter(screen.getByTestId('patient-row-secondary'));

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /acciones clínicas rápidas/i })).toHaveLength(1);
    });
  });
});
