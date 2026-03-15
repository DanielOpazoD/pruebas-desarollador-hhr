import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTerminologySuggestor } from '@/components/shared/hooks/useTerminologySuggestor';

vi.mock('@/services/terminology/terminologyService', () => ({
  searchDiagnoses: vi.fn().mockResolvedValue([]),
  forceAISearch: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/terminology/cie10AISearch', () => ({
  checkAIAvailability: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/services/terminology/aiResultsCache', () => ({
  getCachedAIResults: vi.fn().mockReturnValue(null),
  cacheAIResults: vi.fn(),
}));

describe('useTerminologySuggestor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('preserves the selected cie10 text when reopening the modal', async () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useTerminologySuggestor({
        value: 'Taquicardia supraventricular [I47.1]',
        onChange,
        cie10Code: 'I47.1',
        freeTextValue: 'taquicardia',
      })
    );

    await act(async () => {
      result.current.actions.setQuery('Taquicardia supraventricular [I47.1]');
      result.current.actions.setIsModalOpen(true);
    });

    await waitFor(() => {
      expect(result.current.state.query).toBe('Taquicardia supraventricular [I47.1]');
    });
  });
});
