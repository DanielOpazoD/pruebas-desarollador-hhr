const LEGACY_READ_BLOCK_KEY = 'hhr_legacy_read_block_v1';
const LEGACY_READ_BLOCK_TTL_MS = 6 * 60 * 60 * 1000;

let legacyReadBlockedForSession = false;
import { clearLegacyDeniedPathCache } from './legacyFirebaseDeniedPathCache';

export { cacheLegacyDeniedPath, isLegacyPathDenied } from './legacyFirebaseDeniedPathCache';
export {
  cacheLegacyMissingDate,
  clearLegacyMissingDate,
  clearLegacyMissingDateCache,
  isLegacyDateCachedMissing,
} from './legacyFirebaseMissingDateCache';

const readLegacyReadBlockTimestamp = (): number | null => {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = window.localStorage.getItem(LEGACY_READ_BLOCK_KEY);
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
};

const writeLegacyReadBlockTimestamp = (timestamp: number): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(LEGACY_READ_BLOCK_KEY, String(timestamp));
};

const removeLegacyReadBlockTimestamp = (): void => {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.removeItem(LEGACY_READ_BLOCK_KEY);
};

export const clearLegacyReadBlock = (): void => {
  legacyReadBlockedForSession = false;
  clearLegacyDeniedPathCache();
  removeLegacyReadBlockTimestamp();
};

export const registerLegacyPermissionDeniedBlock = (): void => {
  legacyReadBlockedForSession = true;
  writeLegacyReadBlockTimestamp(Date.now());
};

export const isLegacyReadBlocked = (): boolean => {
  if (legacyReadBlockedForSession) return true;
  const timestamp = readLegacyReadBlockTimestamp();
  if (!timestamp) return false;
  if (Date.now() - timestamp <= LEGACY_READ_BLOCK_TTL_MS) {
    legacyReadBlockedForSession = true;
    return true;
  }

  removeLegacyReadBlockTimestamp();
  return false;
};
