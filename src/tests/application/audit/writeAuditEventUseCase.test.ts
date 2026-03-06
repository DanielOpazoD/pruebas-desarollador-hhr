import { describe, expect, it, vi, beforeEach } from 'vitest';
import { executeWriteAuditEvent } from '@/application/audit/writeAuditEventUseCase';
import * as auditService from '@/services/admin/auditService';

vi.mock('@/services/admin/auditService', () => ({
  logAuditEvent: vi.fn(),
}));

describe('executeWriteAuditEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns success when the audit service resolves', async () => {
    vi.mocked(auditService.logAuditEvent).mockResolvedValueOnce(undefined);

    const result = await executeWriteAuditEvent({
      userId: 'user-1',
      action: 'PATIENT_ADMITTED',
      entityType: 'patient',
      entityId: 'R1',
      details: { patientName: 'John' },
      patientRut: '11.111.111-1',
      recordDate: '2026-03-06',
    });

    expect(result.status).toBe('success');
    expect(auditService.logAuditEvent).toHaveBeenCalledWith(
      'user-1',
      'PATIENT_ADMITTED',
      'patient',
      'R1',
      { patientName: 'John' },
      '11.111.111-1',
      '2026-03-06',
      undefined
    );
  });

  it('returns failed when the audit service throws', async () => {
    vi.mocked(auditService.logAuditEvent).mockRejectedValueOnce(new Error('audit failed'));

    const result = await executeWriteAuditEvent({
      userId: 'user-1',
      action: 'PATIENT_ADMITTED',
      entityType: 'patient',
      entityId: 'R1',
      details: { patientName: 'John' },
    });

    expect(result.status).toBe('failed');
    expect(result.issues[0]?.message).toBe('audit failed');
  });
});
