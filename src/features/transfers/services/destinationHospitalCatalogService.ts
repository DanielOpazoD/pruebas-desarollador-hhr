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
    return [];
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

  return normalized;
};

export const getDestinationHospitalCatalog = async (): Promise<DestinationHospitalOption[]> => {
  const configured = await getAppSetting<unknown>(TRANSFER_DESTINATION_HOSPITALS_KEY, null);
  const configuredCatalog = normalizeCatalog(configured);
  if (configuredCatalog.length === 0) {
    return fallbackCatalog;
  }

  const seenIds = new Set(fallbackCatalog.map(entry => entry.id.toLowerCase()));
  const seenNames = new Set(fallbackCatalog.map(entry => toId(entry.name)));
  const mergedCatalog = [...fallbackCatalog];

  configuredCatalog.forEach(entry => {
    const normalizedId = entry.id.toLowerCase();
    const normalizedName = toId(entry.name);
    if (seenIds.has(normalizedId) || seenNames.has(normalizedName)) {
      return;
    }
    seenIds.add(normalizedId);
    seenNames.add(normalizedName);
    mergedCatalog.push(entry);
  });

  return mergedCatalog;
};
