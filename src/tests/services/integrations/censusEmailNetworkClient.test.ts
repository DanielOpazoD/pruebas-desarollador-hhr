import { describe, it, expect, vi } from 'vitest';
import { sendCensusEmailRequest } from '@/services/integrations/censusEmailNetworkClient';

const makeResponse = (status: number, text: string): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    text: async () => text,
  }) as unknown as Response;

describe('censusEmailNetworkClient', () => {
  it('sends request successfully on first attempt', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeResponse(200, 'OK'));

    const response = await sendCensusEmailRequest({
      endpoint: '/.netlify/functions/send-census-email',
      body: JSON.stringify({ ok: true }),
      userEmail: 'test@hospital.cl',
      userRole: 'admin',
      fetchImpl,
    });

    expect(response.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('retries once on retryable HTTP status', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(makeResponse(500, 'Temporary error'))
      .mockResolvedValueOnce(makeResponse(200, 'OK'));

    const response = await sendCensusEmailRequest({
      endpoint: '/.netlify/functions/send-census-email',
      body: JSON.stringify({ ok: true }),
      fetchImpl,
    });

    expect(response.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('retries once on network TypeError', async () => {
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('Network down'))
      .mockResolvedValueOnce(makeResponse(200, 'OK'));

    const response = await sendCensusEmailRequest({
      endpoint: '/.netlify/functions/send-census-email',
      body: JSON.stringify({ ok: true }),
      fetchImpl,
    });

    expect(response.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('fails fast on non-retryable HTTP status', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(makeResponse(400, 'Bad Request'));

    await expect(
      sendCensusEmailRequest({
        endpoint: '/.netlify/functions/send-census-email',
        body: JSON.stringify({ ok: true }),
        fetchImpl,
      })
    ).rejects.toThrow('Bad Request');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
