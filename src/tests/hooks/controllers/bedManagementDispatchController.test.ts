import { describe, expect, it, vi } from 'vitest';
import { executeBedManagementAction } from '@/hooks/controllers/bedManagementDispatchController';

describe('bedManagementDispatchController', () => {
  it('stops dispatch when validation fails', () => {
    const patchRecord = vi.fn();

    executeBedManagementAction({
      currentRecord: {
        date: '2026-03-06',
        beds: {
          R1: { patientName: 'Paciente', rut: '11.111.111-1' },
        },
      } as any,
      action: {
        type: 'UPDATE_PATIENT',
        bedId: 'R1',
        field: 'admissionDate',
        value: '2099-01-01',
      } as any,
      validation: {
        processFieldValue: vi.fn().mockReturnValue({ valid: false, error: 'invalid' }),
      } as any,
      bedAudit: {} as any,
      patchRecord,
    });

    expect(patchRecord).not.toHaveBeenCalled();
  });

  it('applies patch after validation and audit', () => {
    const patchRecord = vi.fn();
    const auditPatientChange = vi.fn();

    executeBedManagementAction({
      currentRecord: {
        date: '2026-03-06',
        beds: {
          R1: { patientName: 'Paciente', rut: '11.111.111-1', age: '20' },
        },
      } as any,
      action: {
        type: 'UPDATE_PATIENT',
        bedId: 'R1',
        field: 'age',
        value: '21',
      } as any,
      validation: {
        processFieldValue: vi.fn().mockReturnValue({ valid: true, value: '21' }),
      } as any,
      bedAudit: {
        auditPatientChange,
      } as any,
      patchRecord,
    });

    expect(auditPatientChange).toHaveBeenCalled();
    expect(patchRecord).toHaveBeenCalledWith({
      'beds.R1.age': '21',
    });
  });
});
