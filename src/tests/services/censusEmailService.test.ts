import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/integrations/censusEmailRuntimePolicy', () => ({
  getDevelopmentSendDisabledMessage: vi.fn(() => 'disabled'),
  resolveCensusEmailRuntimePolicy: vi.fn(() => ({
    endpoint: '/.netlify/functions/send-census-email',
    allowDevelopmentEmailSend: true,
  })),
}));

vi.mock('@/services/integrations/censusEmailNetworkClient', () => ({
  sendCensusEmailRequest: vi.fn(),
}));

vi.mock('@/services/integrations/censusEmailAudit', () => ({
  saveCensusEmailExportPassword: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/services/integrations/censusEmailRecipients', () => ({
  resolveCensusEmailRecipients: vi.fn((recipients?: string[]) => recipients ?? []),
}));

vi.mock('@/services/integrations/censusEmailSendPolicy', () => ({
  assertCensusEmailSendingAllowed: vi.fn(),
}));

vi.mock('@/services/integrations/censusEmailRequestPayload', () => ({
  buildCensusEmailRequestBody: vi.fn(() => JSON.stringify({ payload: true })),
}));

import { sendCensusEmailRequest } from '@/services/integrations/censusEmailNetworkClient';
import { triggerCensusEmail } from '@/services/integrations/censusEmailService';

describe('censusEmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a validated email response payload', async () => {
    vi.mocked(sendCensusEmailRequest).mockResolvedValue({
      json: async () => ({
        success: true,
        message: 'Correo enviado',
        gmailId: 'gmail-123',
        censusDate: '2026-03-14',
        exportPassword: 'secret',
      }),
    } as Response);

    await expect(
      triggerCensusEmail({
        date: '2026-03-14',
        records: [{ date: '2026-03-14', beds: {} } as never],
        recipients: ['test@hospital.cl'],
        userEmail: 'admin@hospital.cl',
        userRole: 'admin',
      })
    ).resolves.toEqual(
      expect.objectContaining({
        success: true,
        message: 'Correo enviado',
        gmailId: 'gmail-123',
      })
    );
  });

  it('rejects malformed success payloads', async () => {
    vi.mocked(sendCensusEmailRequest).mockResolvedValue({
      json: async () => ({
        success: true,
        message: 'Correo enviado',
      }),
    } as Response);

    await expect(
      triggerCensusEmail({
        date: '2026-03-14',
        records: [{ date: '2026-03-14', beds: {} } as never],
        recipients: ['test@hospital.cl'],
        userEmail: 'admin@hospital.cl',
        userRole: 'admin',
      })
    ).rejects.toThrow();
  });

  it('passes through the shared request contract when building the payload', async () => {
    const { buildCensusEmailRequestBody } =
      await import('@/services/integrations/censusEmailRequestPayload');

    expect(() =>
      buildCensusEmailRequestBody({
        date: '2026-03-14',
        records: [{ date: '2026-03-14', beds: {} } as never],
        recipients: ['test@hospital.cl'],
      })
    ).not.toThrow();
  });
});
