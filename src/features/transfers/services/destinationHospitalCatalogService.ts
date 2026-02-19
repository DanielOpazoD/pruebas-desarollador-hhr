import {
  DESTINATION_HOSPITALS,
  type DestinationHospitalOption,
} from '@/constants/transferConstants';
import { getAppSetting } from '@/services/settingsService';

const TRANSFER_DESTINATION_HOSPITALS_KEY = 'transferDestinationHospitals';

const fallbackCatalog = [...DESTINATION_HOSPITALS];

const toId = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

const normalizeCatalog = (raw: unknown): DestinationHospitalOption[] => {
  if (!Array.isArray(raw)) {
    return fallbackCatalog;
  }

  const normalized = raw
    .map(entry => {
      if (typeof entry === 'string') {
        const name = entry.trim();
        if (!name) return null;
        return { id: toId(name), name, city: '' } as DestinationHospitalOption;
      }

      if (entry && typeof entry === 'object') {
        const candidate = entry as { id?: unknown; name?: unknown; city?: unknown };
        const name = typeof candidate.name === 'string' ? candidate.name.trim() : '';
        if (!name) return null;
        const id =
          typeof candidate.id === 'string' && candidate.id.trim()
            ? candidate.id.trim()
            : toId(name);
        const city = typeof candidate.city === 'string' ? candidate.city.trim() : '';
        return { id, name, city } as DestinationHospitalOption;
      }

      return null;
    })
    .filter((entry): entry is DestinationHospitalOption => entry !== null);

  return normalized.length > 0 ? normalized : fallbackCatalog;
};

export const getDestinationHospitalCatalog = async (): Promise<DestinationHospitalOption[]> => {
  const configured = await getAppSetting<unknown>(TRANSFER_DESTINATION_HOSPITALS_KEY, null);
  return normalizeCatalog(configured);
};
