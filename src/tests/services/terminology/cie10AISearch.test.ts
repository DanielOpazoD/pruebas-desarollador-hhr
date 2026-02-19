import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as cie10Module from '@/services/terminology/cie10AISearch';

// Mock AI Request Manager
vi.mock('../ai/aiRequestManager', () => ({
  aiRequestManager: {
    enqueue: vi.fn((_id, fn) => fn()),
  },
}));

// Mock fetch
global.fetch = vi.fn();

describe('cie10AISearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array for short queries', async () => {
    const result = await cie10Module.searchCIE10WithAI('a');
    expect(result).toEqual([]);
  });

  it('should check AI availability via serverless function success', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true }),
    });

    const available = await cie10Module.checkAIAvailability();
    expect(available).toBe(true);
  });

  it('should perform AI search using serverless function', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, results: [{ code: 'B01', description: 'Results' }] }),
    });

    const results = await cie10Module.searchCIE10WithAI('query-serverless');
    expect(results).toEqual([{ code: 'B01', description: 'Results' }]);
  });

  it('should return empty array when serverless is unavailable', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: false }),
    });

    const results = await cie10Module.searchCIE10WithAI('query-no-backend');
    expect(results).toEqual([]);
  });
});
