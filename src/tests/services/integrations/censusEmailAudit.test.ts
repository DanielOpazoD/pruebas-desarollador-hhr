import { beforeEach, describe, expect, it, vi } from 'vitest';

const exportPasswordMocks = vi.hoisted(() => ({
  savePasswordToFirestore: vi.fn(),
}));

vi.mock('@/services/security/exportPasswordService', () => ({
  savePasswordToFirestore: exportPasswordMocks.savePasswordToFirestore,
}));

import { saveCensusEmailExportPassword } from '@/services/integrations/censusEmailAudit';

describe('censusEmailAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exportPasswordMocks.savePasswordToFirestore.mockResolvedValue(undefined);
  });

  it('persists email export passwords through the shared export password service', async () => {
    await saveCensusEmailExportPassword('2026-04-04', 'secret', 'user@hospital.cl');

    expect(exportPasswordMocks.savePasswordToFirestore).toHaveBeenCalledWith(
      '2026-04-04',
      'secret',
      'user@hospital.cl',
      'email'
    );
  });
});
