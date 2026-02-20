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
const mockFetch = vi.mocked(global.fetch);

vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = {
      generateContent: vi.fn().mockResolvedValue({
        text: JSON.stringify([{ code: 'A00', description: 'Cólera', category: 'Infecciosas' }]),
      }),
    };
  },
}));

describe('cie10AISearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return empty array for short queries', async () => {
    const result = await cie10Module.searchCIE10WithAI('a');
    expect(result).toEqual([]);
  });

  it('should check AI availability via serverless function success', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true }),
    } as Response);

    const available = await cie10Module.checkAIAvailability();
    expect(available).toBe(true);
  });

  it('should perform AI search using serverless function', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: true, results: [{ code: 'B01', description: 'Results' }] }),
    } as Response);

    const results = await cie10Module.searchCIE10WithAI('query-serverless');
    expect(results).toEqual([{ code: 'B01', description: 'Results' }]);
  });

  it('should return empty array when serverless is unavailable', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: false }),
    } as Response);

    vi.stubEnv('VITE_LOCAL_GEMINI_API_KEY', '');
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    vi.stubEnv('VITE_API_KEY', '');
    const results = await cie10Module.searchCIE10WithAI('query-no-backend');
    vi.unstubAllEnvs();
    expect(results).toEqual([]);
  });

  it('should use local fallback in dev when serverless is unavailable and local key exists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ available: false }),
    } as Response);

    vi.stubEnv('VITE_LOCAL_GEMINI_API_KEY', 'test-local-key');
    const results = await cie10Module.searchCIE10WithAI('query-local-fallback');
    vi.unstubAllEnvs();

    expect(results).toEqual([{ code: 'A00', description: 'Cólera', category: 'Infecciosas' }]);
  });
});
