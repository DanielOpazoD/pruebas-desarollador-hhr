/** @vitest-environment jsdom */
import '../../setup';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { HandoffHeader } from '@/features/handoff/components/HandoffHeader';

describe('HandoffHeader', () => {
  const defaultProps = {
    isMedical: false,
    selectedShift: 'day' as const,
    setSelectedShift: vi.fn(),
    readOnly: false,
    onSendWhatsApp: vi.fn(),
    onShareLink: vi.fn(),
  };

  it('renders correctly in nursing mode', () => {
    render(<HandoffHeader {...defaultProps} />);

    expect(screen.getByText(/Entrega de Turno Enfermería/i)).toBeInTheDocument();
    expect(screen.getByText(/Turno Largo/i)).toBeInTheDocument();
    expect(screen.getByText(/Turno Noche/i)).toBeInTheDocument();
  });

  it('toggles shift on button click in nursing mode', () => {
    render(<HandoffHeader {...defaultProps} />);

    const nightButton = screen.getByText(/Turno Noche/i);
    fireEvent.click(nightButton);

    expect(defaultProps.setSelectedShift).toHaveBeenCalledWith('night');
  });

  it('renders correctly in medical mode', () => {
    render(<HandoffHeader {...defaultProps} isMedical={true} />);

    expect(screen.getByText('Entrega de Turno')).toBeInTheDocument();
    // Shift buttons should NOT be present in medical mode
    expect(screen.queryByText(/Turno Largo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Turno Noche/i)).not.toBeInTheDocument();
  });

  it('shows action buttons in medical mode when not readOnly', () => {
    render(<HandoffHeader {...defaultProps} isMedical={true} />);

    expect(screen.getByTitle(/Enviar por WhatsApp/i)).toBeInTheDocument();
    expect(screen.getByTitle(/Links de firma/i)).toBeInTheDocument();
  });

  it('calls actions on button clicks', () => {
    render(<HandoffHeader {...defaultProps} isMedical={true} />);

    fireEvent.click(screen.getByTitle(/Enviar por WhatsApp/i));
    expect(defaultProps.onSendWhatsApp).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle(/Links de firma/i));
    fireEvent.click(screen.getByText(/Link: todos/i));
    expect(defaultProps.onShareLink).toHaveBeenCalledWith('all');
  });

  it('allows selecting differentiated medical signature links', () => {
    render(<HandoffHeader {...defaultProps} isMedical={true} />);

    fireEvent.click(screen.getByTitle(/Links de firma/i));
    fireEvent.click(screen.getByText(/Link: UPC/i));
    expect(defaultProps.onShareLink).toHaveBeenCalledWith('upc');

    fireEvent.click(screen.getByTitle(/Links de firma/i));
    fireEvent.click(screen.getByText(/Link: No UPC/i));
    expect(defaultProps.onShareLink).toHaveBeenCalledWith('no-upc');
  });

  it('disables WhatsApp button if signature is present', () => {
    render(
      <HandoffHeader
        {...defaultProps}
        isMedical={true}
        medicalSignature={{ doctorName: 'Dr. House', signedAt: '2024-12-11 10:00' }}
      />
    );

    const wsButton = screen.getByTitle(/Enviar por WhatsApp/i);
    expect(wsButton).toBeDisabled();
  });

  it('hides action buttons in readOnly mode', () => {
    render(<HandoffHeader {...defaultProps} isMedical={true} readOnly={true} />);

    expect(screen.queryByTitle(/Enviar por WhatsApp/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Links de firma/i)).not.toBeInTheDocument();
  });
});
