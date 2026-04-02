import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { DataFactory } from '@/tests/factories/DataFactory';
import { AdmissionInput } from '@/features/census/components/patient-row/AdmissionInput';

describe('AdmissionInput', () => {
  it('renders an edit icon button that opens the date picker', () => {
    const data = DataFactory.createMockPatient('R1', {
      admissionDate: '2026-02-20',
      admissionTime: '10:00',
      patientName: 'Paciente Prueba',
    });

    const onChange = vi.fn((_: string) => vi.fn());

    render(
      <table>
        <tbody>
          <tr>
            <AdmissionInput data={data} currentDateString="2026-02-20" onChange={onChange} />
          </tr>
        </tbody>
      </table>
    );

    const dateInput = screen.getByDisplayValue('2026-02-20') as HTMLInputElement;
    const showPicker = vi.fn();
    Object.defineProperty(dateInput, 'showPicker', {
      value: showPicker,
      configurable: true,
    });

    fireEvent.click(screen.getByLabelText('Editar fecha de ingreso'));
    expect(showPicker).toHaveBeenCalledTimes(1);
  });

  it('shows a correction hint for suspicious admission dates and applies the suggestion', () => {
    const data = DataFactory.createMockPatient('R1', {
      admissionDate: '2024-01-01',
      admissionTime: '',
      patientName: 'Paciente Prueba',
    });

    const onChange = vi.fn((_: string) => vi.fn());
    const onMultipleUpdate = vi.fn();

    render(
      <table>
        <tbody>
          <tr>
            <AdmissionInput
              data={data}
              currentDateString="2026-03-10"
              isNewAdmission
              onChange={onChange}
              onMultipleUpdate={onMultipleUpdate}
            />
          </tr>
        </tbody>
      </table>
    );

    const hintButton = screen.getByLabelText('Corregir fecha de ingreso sugerida');
    expect(hintButton).toBeInTheDocument();

    fireEvent.click(hintButton);

    expect(onMultipleUpdate).toHaveBeenCalledWith({
      admissionDate: '2026-03-10',
      admissionTime: expect.any(String),
    });
  });
});
