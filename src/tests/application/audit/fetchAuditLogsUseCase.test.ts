import { describe, expect, it, vi, beforeEach } from 'vitest';
import { executeFetchAuditLogs } from '@/application/audit/fetchAuditLogsUseCase';
import * as auditService from '@/services/admin/auditService';

vi.mock('@/services/admin/auditService', () => ({
  getAuditLogs: vi.fn(),
}));

describe('executeFetchAuditLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns fetched logs on success', async () => {
    vi.mocked(auditService.getAuditLogs).mockResolvedValueOnce([{ id: '1' }] as any);

    const result = await executeFetchAuditLogs({ limit: 25 });

    expect(result.status).toBe('success');
    expect(result.data).toEqual([{ id: '1' }]);
    expect(auditService.getAuditLogs).toHaveBeenCalledWith(25);
  });

  it('returns failed outcome on error', async () => {
    vi.mocked(auditService.getAuditLogs).mockRejectedValueOnce(new Error('fetch failed'));

    const result = await executeFetchAuditLogs();

    expect(result.status).toBe('failed');
    expect(result.issues[0]?.message).toBe('fetch failed');
    expect(result.data).toEqual([]);
  });
});
