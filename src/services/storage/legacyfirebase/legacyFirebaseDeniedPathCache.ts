const LEGACY_DENIED_PATH_CACHE_KEY = 'hhr_legacy_denied_paths_v1';
const LEGACY_DENIED_PATH_TTL_MS = 6 * 60 * 60 * 1000;

const legacyDeniedPathCache = new Map<string, number>();
let legacyDeniedPathCacheHydrated = false;

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

const normalizeLegacyPathKey = (path: string): string => {
  const parts = path.split('/');
  return parts.length <= 1 ? path : parts.slice(0, -1).join('/');
};

const hydrateDeniedPathCache = (): void => {
  if (legacyDeniedPathCacheHydrated) return;
  legacyDeniedPathCacheHydrated = true;

  for (const entry of readPersistedEntries(LEGACY_DENIED_PATH_CACHE_KEY)) {
    if (!Array.isArray(entry) || entry.length !== 2) continue;
    const [pathKey, timestamp] = entry;
    if (
      typeof pathKey !== 'string' ||
      typeof timestamp !== 'number' ||
      !Number.isFinite(timestamp)
    ) {
      continue;
    }
    legacyDeniedPathCache.set(pathKey, timestamp);
  }
};

const persistDeniedPathCache = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(
    LEGACY_DENIED_PATH_CACHE_KEY,
    JSON.stringify(Array.from(legacyDeniedPathCache.entries()))
  );
};

export const clearLegacyDeniedPathCache = (): void => {
  hydrateDeniedPathCache();
  legacyDeniedPathCache.clear();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(LEGACY_DENIED_PATH_CACHE_KEY);
  }
};

export const isLegacyPathDenied = (path: string): boolean => {
  hydrateDeniedPathCache();
  const pathKey = normalizeLegacyPathKey(path);
  const cachedAt = legacyDeniedPathCache.get(pathKey);
  if (!cachedAt) return false;
  if (Date.now() - cachedAt <= LEGACY_DENIED_PATH_TTL_MS) return true;
  legacyDeniedPathCache.delete(pathKey);
  persistDeniedPathCache();
  return false;
};

export const cacheLegacyDeniedPath = (path: string): void => {
  hydrateDeniedPathCache();
  legacyDeniedPathCache.set(normalizeLegacyPathKey(path), Date.now());
  persistDeniedPathCache();
};
