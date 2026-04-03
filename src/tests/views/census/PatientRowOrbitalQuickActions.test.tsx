import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

/**
 * Test suite for the PatientRowOrbitalQuickActions component.
 *
 * Covers the orbital quick-action launcher that floats beside each patient row
 * in the census table. The launcher renders as a fixed-position portal with a
 * trigger button and a vertical stack of clinical action buttons (documents,
 * exams, imaging, indications).
 *
 * Tests verify: trigger visibility and hover behavior across device types,
 * keyboard navigation and focus management, backdrop dismiss behavior,
 * single-launcher ownership across multiple rows, action callback dispatch,
 * hit-box sizing, pointer styles, pointer-events layering, and tab-visibility
 * hover-state cleanup.
 */
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

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });
    fireEvent.click(screen.getByRole('button', { name: /acciones clínicas rápidas/i }));
    fireEvent.click(screen.getByRole('button', { name: /documentos clínicos/i }));
    expect(onViewClinicalDocuments).toHaveBeenCalledTimes(1);

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });
    fireEvent.click(screen.getByRole('button', { name: /acciones clínicas rápidas/i }));
    fireEvent.click(screen.getByRole('button', { name: /solicitud exámenes/i }));
    expect(onViewExamRequest).toHaveBeenCalledTimes(1);

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });
    fireEvent.click(screen.getByRole('button', { name: /acciones clínicas rápidas/i }));
    fireEvent.click(screen.getByRole('button', { name: /solicitud de imágenes/i }));
    expect(onViewImagingRequest).toHaveBeenCalledTimes(1);
  });

  it('supports keyboard opening and arrow navigation across actions', async () => {
    render(
      <table>
        <tbody>
          <tr className="group/patient-row" data-testid="patient-row">
            <td className="relative">
              <PatientRowOrbitalQuickActions
                showClinicalDocumentsAction={true}
                showExamRequestAction={true}
                showImagingRequestAction={true}
                showMedicalIndicationsAction={true}
                onViewClinicalDocuments={vi.fn()}
                onViewExamRequest={vi.fn()}
                onViewImagingRequest={vi.fn()}
                onViewMedicalIndications={vi.fn()}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );

    const trigger = screen.getByRole('button', { name: /acciones clínicas rápidas/i });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });

    const documentsButton = await screen.findByRole('button', { name: /documentos clínicos/i });
    await waitFor(() => {
      expect(documentsButton).toHaveFocus();
    });

    fireEvent.keyDown(documentsButton, { key: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /solicitud exámenes/i })).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('button', { name: /solicitud exámenes/i }), {
      key: 'Escape',
    });

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /documentos clínicos/i })
      ).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
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

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });
    fireEvent.click(screen.getByRole('button', { name: /acciones clínicas rápidas/i }));
    expect(screen.getByRole('button', { name: /documentos clínicos/i })).toBeInTheDocument();

    const backdrop = document.querySelector('.fixed.inset-0.z-\\[60\\]');
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

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });

    await waitFor(() => {
      expect(trigger.className).toContain('opacity-100');
    });

    expect(trigger).toHaveStyle({
      width: '48px',
      height: '48px',
    });
  });

  it('uses enlarged hitboxes for trigger and orbital actions', async () => {
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

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });
    const trigger = screen.getByRole('button', { name: /acciones clínicas rápidas/i });
    fireEvent.click(trigger);

    const documentsButton = screen.getByRole('button', { name: /documentos clínicos/i });

    expect(trigger).toHaveStyle({
      width: '48px',
      height: '48px',
    });
    expect(documentsButton).toHaveStyle({
      minHeight: '44px',
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
    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });
    fireEvent.click(triggers[0]);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /documentos clínicos/i })).toBeInTheDocument();
    });

    fireEvent.mouseMove(screen.getByTestId('patient-row-secondary'), { clientX: 0 });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /acciones clínicas rápidas/i })).toHaveLength(1);
    });
  });

  it('keeps the hovered row active while moving toward the launcher', async () => {
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

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /acciones clínicas rápidas/i })).toHaveLength(1);
    });

    fireEvent.mouseLeave(screen.getByTestId('patient-row'));
    fireEvent.mouseMove(screen.getByTestId('patient-row-secondary'), { clientX: 0 });

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /acciones clínicas rápidas/i })).toHaveLength(1);
    });
  });

  it('shows only one visible honu while moving quickly across rows', async () => {
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
          <tr className="group/patient-row" data-testid="patient-row-tertiary" data-bed-id="R4">
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

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });
    fireEvent.mouseLeave(screen.getByTestId('patient-row'));
    fireEvent.mouseMove(screen.getByTestId('patient-row-secondary'), { clientX: 0 });
    fireEvent.mouseLeave(screen.getByTestId('patient-row-secondary'));
    fireEvent.mouseMove(screen.getByTestId('patient-row-tertiary'), { clientX: 0 });

    await waitFor(() => {
      const triggers = screen.getAllByRole('button', { name: /acciones clínicas rápidas/i });
      const visibleTriggers = triggers.filter(trigger => trigger.className.includes('opacity-100'));
      expect(visibleTriggers).toHaveLength(1);
    });
  });

  it('renders the quick actions as a vertical column below the honu', async () => {
    render(
      <table>
        <tbody>
          <tr className="group/patient-row" data-testid="patient-row">
            <td className="relative">
              <PatientRowOrbitalQuickActions
                showClinicalDocumentsAction={true}
                showExamRequestAction={true}
                showImagingRequestAction={true}
                showMedicalIndicationsAction={true}
                onViewClinicalDocuments={vi.fn()}
                onViewExamRequest={vi.fn()}
                onViewImagingRequest={vi.fn()}
                onViewMedicalIndications={vi.fn()}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });
    fireEvent.click(screen.getByRole('button', { name: /acciones clínicas rápidas/i }));

    const documentsButton = screen.getByRole('button', { name: /documentos clínicos/i });
    const laboratoryButton = screen.getByRole('button', { name: /solicitud exámenes/i });
    const imagingButton = screen.getByRole('button', { name: /solicitud de imágenes/i });
    const indicationsButton = screen.getByRole('button', { name: /indicaciones médicas/i });

    expect(documentsButton).toHaveTextContent('Documentos');
    expect(laboratoryButton).toHaveTextContent('Laboratorio');
    expect(imagingButton).toHaveTextContent('Imágenes');
    expect(indicationsButton).toHaveTextContent('Indicaciones');

    // Each button is wrapped in a motion.div (renders as div), so the stack
    // container children are wrapper divs, each containing an action button.
    const stack = documentsButton.parentElement!.parentElement!;
    expect(stack.className).toContain('flex-col');

    const wrapperDivs = Array.from(stack.children);
    expect(wrapperDivs).toHaveLength(4);

    const buttonsInOrder = wrapperDivs.map(wrapper => wrapper.querySelector('button'));
    expect(buttonsInOrder).toEqual([
      documentsButton,
      laboratoryButton,
      imagingButton,
      indicationsButton,
    ]);
  });

  it('resets hover state when tab loses visibility', async () => {
    render(
      <table>
        <tbody>
          <tr className="group/patient-row" data-testid="patient-row" data-bed-id="R5">
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

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });

    await waitFor(() => {
      const trigger = screen.getByRole('button', { name: /acciones clínicas rápidas/i });
      expect(trigger.className).toContain('opacity-100');
    });

    // Simulate tab going to background
    act(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // The launcher owner event dispatches null, so trigger should disappear
    // or become invisible as hover state is cleared.
    await waitFor(() => {
      const triggers = screen.queryAllByRole('button', { name: /acciones clínicas rápidas/i });
      const visibleTriggers = triggers.filter(t => t.className.includes('opacity-100'));
      expect(visibleTriggers).toHaveLength(0);
    });

    // Restore document.hidden for subsequent tests
    Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  });

  it('action buttons show cursor pointer across entire area', () => {
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

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });
    fireEvent.click(screen.getByRole('button', { name: /acciones clínicas rápidas/i }));

    const documentsButton = screen.getByRole('button', { name: /documentos clínicos/i });
    const examButton = screen.getByRole('button', { name: /solicitud exámenes/i });
    const imagingButton = screen.getByRole('button', { name: /solicitud de imágenes/i });

    for (const button of [documentsButton, examButton, imagingButton]) {
      expect(button.className).toContain('cursor-pointer');
    }
  });

  it('backdrop does not intercept clicks on action buttons', () => {
    render(
      <table>
        <tbody>
          <tr className="group/patient-row" data-testid="patient-row">
            <td className="relative">
              <PatientRowOrbitalQuickActions
                showClinicalDocumentsAction={true}
                showExamRequestAction={true}
                showImagingRequestAction={false}
                onViewClinicalDocuments={vi.fn()}
                onViewExamRequest={vi.fn()}
              />
            </td>
          </tr>
        </tbody>
      </table>
    );

    fireEvent.mouseMove(screen.getByTestId('patient-row'), { clientX: 0 });
    fireEvent.click(screen.getByRole('button', { name: /acciones clínicas rápidas/i }));

    // The outer fixed wrapper should have pointer-events: none so it does not
    // block interaction with the page beneath.
    const outerWrapper = document.querySelector('.pointer-events-none.fixed.z-\\[70\\]');
    expect(outerWrapper).toBeTruthy();
    expect(outerWrapper!.className).toContain('pointer-events-none');

    // The action stack container should re-enable pointer-events so its
    // buttons remain clickable.
    const actionContainer = document.querySelector('.pointer-events-auto.absolute');
    expect(actionContainer).toBeTruthy();
    expect(actionContainer!.className).toContain('pointer-events-auto');
  });
});
