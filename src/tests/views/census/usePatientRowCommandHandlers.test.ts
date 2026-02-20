import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ChangeEvent } from 'react';
import type { DeviceInstance } from '@/types';
import { usePatientRowCommandHandlers } from '@/features/census/components/patient-row/usePatientRowCommandHandlers';

describe('usePatientRowCommandHandlers', () => {
  it('maps UI events to patient row command handlers', () => {
    const commands = {
      setTextField: vi.fn(),
      setCheckboxField: vi.fn(),
      setDevices: vi.fn(),
      setDeviceDetails: vi.fn(),
      setDeviceHistory: vi.fn(),
      saveDemographics: vi.fn(),
    };

    const { result } = renderHook(() => usePatientRowCommandHandlers(commands));

    act(() => {
      result.current.handleTextChange('patientName')({
        target: { value: 'Paciente X' },
      } as ChangeEvent<HTMLInputElement>);
      result.current.handleCheckboxChange('isUPC')({
        target: { checked: true },
      } as ChangeEvent<HTMLInputElement>);
      result.current.handleDevicesChange(['VMI']);
      result.current.handleDeviceDetailsChange({
        VMI: { installationDate: '2026-02-16', note: 'Detalle' },
      });
      const history: DeviceInstance[] = [
        {
          id: 'h1',
          type: 'VMI',
          installationDate: '2026-02-16',
          status: 'Active',
          createdAt: 1,
          updatedAt: 1,
        },
      ];
      result.current.handleDeviceHistoryChange(history);
      result.current.handleDemographicsSave({ age: '40' });
    });

    expect(commands.setTextField).toHaveBeenCalledWith('patientName', 'Paciente X');
    expect(commands.setCheckboxField).toHaveBeenCalledWith('isUPC', true);
    expect(commands.setDevices).toHaveBeenCalledWith(['VMI']);
    expect(commands.setDeviceDetails).toHaveBeenCalledWith({
      VMI: { installationDate: '2026-02-16', note: 'Detalle' },
    });
    expect(commands.setDeviceHistory).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'h1' })])
    );
    expect(commands.saveDemographics).toHaveBeenCalledWith({ age: '40' });
  });
});
