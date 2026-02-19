import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDestinationHospitalCatalog } from '@/features/transfers/services/destinationHospitalCatalogService';
import { DESTINATION_HOSPITALS } from '@/constants/transferConstants';
import { getAppSetting } from '@/services/settingsService';

vi.mock('@/services/settingsService', () => ({
  getAppSetting: vi.fn(),
}));

describe('destinationHospitalCatalogService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns fallback catalog when setting is missing', async () => {
    vi.mocked(getAppSetting).mockResolvedValue(null);
    const catalog = await getDestinationHospitalCatalog();
    expect(catalog).toEqual(DESTINATION_HOSPITALS);
  });

  it('normalizes string-based settings into catalog entries', async () => {
    vi.mocked(getAppSetting).mockResolvedValue(['Hospital A', ' Hospital B ']);
    const catalog = await getDestinationHospitalCatalog();

    expect(catalog).toEqual([
      { id: 'hospital_a', name: 'Hospital A', city: '' },
      { id: 'hospital_b', name: 'Hospital B', city: '' },
    ]);
  });
});
