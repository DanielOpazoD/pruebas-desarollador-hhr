const LEGACY_MISSING_DATE_TTL_MS = 30 * 60 * 1000;
const LEGACY_MISSING_DATE_CACHE_KEY = 'hhr_legacy_missing_dates_v1';
const LEGACY_MISSING_DATE_CACHE_MAX = 120;

const legacyMissingDateCache = new Map<string, number>();
let legacyMissingDateCacheHydrated = false;

const readPersistedEntries = (storageKey: string): Array<[string, number]> => {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<[string, number]>;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const hydrateMissingDateCache = (): void => {
  if (legacyMissingDateCacheHydrated) return;
  legacyMissingDateCacheHydrated = true;

  for (const entry of readPersistedEntries(LEGACY_MISSING_DATE_CACHE_KEY)) {
    if (!Array.isArray(entry) || entry.length !== 2) continue;
    const [date, timestamp] = entry;
    if (typeof date !== 'string' || typeof timestamp !== 'number' || !Number.isFinite(timestamp)) {
      continue;
    }
    legacyMissingDateCache.set(date, timestamp);
  }
};

const persistMissingDateCache = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(
    LEGACY_MISSING_DATE_CACHE_KEY,
    JSON.stringify(Array.from(legacyMissingDateCache.entries()))
  );
};

export const clearLegacyMissingDateCache = (): void => {
  hydrateMissingDateCache();
  legacyMissingDateCache.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(LEGACY_MISSING_DATE_CACHE_KEY);
  }
};

export const isLegacyDateCachedMissing = (date: string): boolean => {
  hydrateMissingDateCache();
  const cachedAt = legacyMissingDateCache.get(date);
  if (!cachedAt) return false;
  if (Date.now() - cachedAt <= LEGACY_MISSING_DATE_TTL_MS) return true;
  legacyMissingDateCache.delete(date);
  persistMissingDateCache();
  return false;
};

export const cacheLegacyMissingDate = (date: string): void => {
  hydrateMissingDateCache();
  legacyMissingDateCache.set(date, Date.now());

  if (legacyMissingDateCache.size > LEGACY_MISSING_DATE_CACHE_MAX) {
    let oldestDate: string | null = null;
    let oldestTimestamp = Number.POSITIVE_INFINITY;

    for (const [cachedDate, timestamp] of legacyMissingDateCache.entries()) {
      if (timestamp < oldestTimestamp) {
        oldestTimestamp = timestamp;
        oldestDate = cachedDate;
      }
    }

    if (oldestDate) {
      legacyMissingDateCache.delete(oldestDate);
    }
  }

  persistMissingDateCache();
};

export const clearLegacyMissingDate = (date: string): void => {
  hydrateMissingDateCache();
  legacyMissingDateCache.delete(date);
  persistMissingDateCache();
};
