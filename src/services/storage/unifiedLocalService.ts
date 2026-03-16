import {
  getAllDates,
  getAllRecords,
  getPreviousDayRecord,
  getRecordForDate,
  saveRecord,
} from '@/services/storage/indexeddb/indexedDbRecordService';
import { getCatalog, saveCatalog } from '@/services/storage/indexeddb/indexedDbCatalogService';
import { NURSES_STORAGE_KEY, STORAGE_KEY } from '@/services/storage/localstorage/localStorageCore';
import {
  clearAllData as clearAllLegacyLocalData,
  isLocalStorageAvailable,
} from '@/services/storage/localstorage/localStorageMaintenanceService';

export { STORAGE_KEY, NURSES_STORAGE_KEY, isLocalStorageAvailable };

export const getStoredRecords = getAllRecords;
export const saveRecordLocal = saveRecord;

export const getStoredNurses = (): Promise<string[]> => getCatalog('nurses');
export const saveStoredNurses = (nurses: string[]): Promise<void> => saveCatalog('nurses', nurses);

export { getRecordForDate, getAllDates, getPreviousDayRecord };

export const clearAllData = clearAllLegacyLocalData;
