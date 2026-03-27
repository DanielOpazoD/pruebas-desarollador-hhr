import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateClinicalSummary } from '@/services/ai/clinicalSummaryService';

vi.mock('@/services/auth/authRequestHeaders', () => ({
  resolveCurrentUserAuthHeaders: vi.fn().mockResolvedValue({
    Authorization: 'Bearer token-123',
  }),
}));

describe('clinicalSummaryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('returns a validated clinical summary payload', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        available: true,
        provider: 'openai',
        model: 'gpt-4o-mini',
        summary: 'Paciente estable.',
      }),
    } as Response);

    await expect(
      generateClinicalSummary({
        recordDate: '2026-03-26',
        bedId: 'R1',
        instruction: 'Resumir.',
      })
    ).resolves.toEqual({
      available: true,
      provider: 'openai',
      model: 'gpt-4o-mini',
      summary: 'Paciente estable.',
    });
  });

  it('rejects malformed success payloads', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        available: true,
        provider: 'openai',
      }),
    } as Response);

    await expect(
      generateClinicalSummary({
        recordDate: '2026-03-26',
        bedId: 'R1',
      })
    ).rejects.toThrow();
  });

  it('uses the serverless error contract for failed requests', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'No autorizado.',
      }),
    } as Response);

    await expect(
      generateClinicalSummary({
        recordDate: '2026-03-26',
        bedId: 'R1',
      })
    ).rejects.toThrow('No autorizado.');
  });
});
