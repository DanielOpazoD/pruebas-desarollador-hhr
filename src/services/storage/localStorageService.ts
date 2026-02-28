/**
 * localStorage public facade.
 *
 * Keeps existing imports stable while delegating implementation
 * to focused localstorage modules.
 *
 * @deprecated Prefer `@/services/storage/unifiedLocalService` for app-level access.
 * This module remains only for backwards compatibility and focused legacy tests.
 */

export { STORAGE_KEY, NURSES_STORAGE_KEY } from './localstorage/localStorageCore';

export {
  getStoredRecords,
  saveRecordLocal,
  getRecordForDate,
  getAllDates,
  getPreviousDayRecord,
  deleteRecordLocal,
} from './localstorage/localStorageRecordService';

export { getStoredNurses, saveStoredNurses } from './localstorage/localStorageNurseService';

export {
  clearAllData,
  isLocalStorageAvailable,
} from './localstorage/localStorageMaintenanceService';
