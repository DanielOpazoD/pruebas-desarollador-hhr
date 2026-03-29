import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NameInput } from '@/features/census/components/patient-row/NameInput';
import { DataFactory } from '@/tests/factories/DataFactory';
import type { DebouncedTextHandler } from '@/features/census/components/patient-row/inputCellTypes';

describe('NameInput', () => {
  const noopChange: DebouncedTextHandler = () => vi.fn();

  it('shows full name from split fields in order nombre apellidos', () => {
    const data = DataFactory.createMockPatient('R1', {
      patientName: '',
      firstName: 'Juan Carlos',
      lastName: 'Perez',
      secondLastName: 'Soto',
    });

    const { container } = render(
      <table>
        <tbody>
          <tr>
            <NameInput data={data} onChange={noopChange} />
          </tr>
        </tbody>
      </table>
    );

    const nameInput = container.querySelector('input[name="patientName"]') as HTMLInputElement;
    expect(nameInput.value).toBe('Juan Carlos Perez Soto');
    expect(nameInput).toHaveAttribute('readonly');
  });

  it('falls back to legacy patientName when split fields are empty', () => {
    const data = DataFactory.createMockPatient('R1', {
      patientName: 'Paciente Legacy',
      firstName: '',
      lastName: '',
      secondLastName: '',
    });

    const { container } = render(
      <table>
        <tbody>
          <tr>
            <NameInput data={data} onChange={noopChange} />
          </tr>
        </tbody>
      </table>
    );

    const nameInput = container.querySelector('input[name="patientName"]') as HTMLInputElement;
    expect(nameInput.value).toBe('Paciente Legacy');
    expect(nameInput).toHaveAttribute('readonly');
  });

  it('prefers patientName when explicit split fields are inconsistent', () => {
    const data = DataFactory.createMockPatient('R1', {
      patientName: 'Paciente Nuevo',
      firstName: 'Paciente',
      lastName: 'Antiguo',
      secondLastName: 'Persistente',
    });

    const { container } = render(
      <table>
        <tbody>
          <tr>
            <NameInput data={data} onChange={noopChange} />
          </tr>
        </tbody>
      </table>
    );

    const nameInput = container.querySelector('input[name="patientName"]') as HTMLInputElement;
    expect(nameInput.value).toBe('Paciente Nuevo');
    expect(nameInput).toHaveAttribute('readonly');
  });

  it('does not emit inline updates for main-row names', () => {
    const handlePatientName = vi.fn();
    const onChange: DebouncedTextHandler = field =>
      field === 'patientName' ? handlePatientName : vi.fn();
    const data = DataFactory.createMockPatient('R1', {
      patientName: 'Paciente Principal',
      firstName: 'Paciente',
      lastName: 'Principal',
      secondLastName: '',
      identityStatus: 'official',
      rut: '12.345.678-9',
    });

    const { container } = render(
      <table>
        <tbody>
          <tr>
            <NameInput data={data} onChange={onChange} />
          </tr>
        </tbody>
      </table>
    );

    const nameInput = container.querySelector('input[name="patientName"]') as HTMLInputElement;
    expect(nameInput).toHaveAttribute('readonly');

    fireEvent.change(nameInput, { target: { value: 'Paciente Editado' } });
    fireEvent.blur(nameInput);
    expect(handlePatientName).not.toHaveBeenCalled();
  });

  it('allows inline edition for provisional clinical crib rows', () => {
    const handlePatientName = vi.fn();
    const onChange: DebouncedTextHandler = field =>
      field === 'patientName' ? handlePatientName : vi.fn();
    const data = DataFactory.createMockPatient('R1-cuna', {
      patientName: 'RN de Madre',
      identityStatus: 'provisional',
      rut: '',
    });

    const { container } = render(
      <table>
        <tbody>
          <tr>
            <NameInput data={data} isSubRow onChange={onChange} />
          </tr>
        </tbody>
      </table>
    );

    const nameInput = container.querySelector('input[name="patientName"]') as HTMLInputElement;
    expect(nameInput).not.toHaveAttribute('readonly');

    fireEvent.change(nameInput, { target: { value: 'RN de Maria Tuki' } });
    fireEvent.blur(nameInput);
    expect(handlePatientName).toHaveBeenCalledWith('RN de Maria Tuki');
  });

  it('keeps name read-only for official clinical crib rows', () => {
    const data = DataFactory.createMockPatient('R1-cuna', {
      patientName: 'Jose Tuki',
      firstName: 'Jose',
      lastName: 'Tuki',
      secondLastName: '',
      identityStatus: 'official',
      rut: '12.345.678-9',
    });

    const { container } = render(
      <table>
        <tbody>
          <tr>
            <NameInput data={data} isSubRow onChange={noopChange} />
          </tr>
        </tbody>
      </table>
    );

    const nameInput = container.querySelector('input[name="patientName"]') as HTMLInputElement;
    expect(nameInput).toHaveAttribute('readonly');
  });
});
