/**
 * Data Service - Barrel Export
 *
 * This file provides backwards compatibility for existing imports.
 * All functionality has been refactored into focused modules.
 * Prefer importing from dedicated modules in new code. Keep this surface small.
 *
 * New code should import directly from the specific modules:
 * - storage/unifiedLocalService
 * - factories/patientFactory
 * - calculations/statsCalculator
 * - repositories/dailyRecordRepositoryReadService
 * - repositories/dailyRecordRepositoryWriteService
 * - repositories/dailyRecordRepositoryInitializationService
 * - utils/dateUtils
 *
 * Retirement is tracked in `reports/compatibility-governance.md`.
 */

export {
  getStoredRecords,
  saveRecordLocal,
  getStoredNurses,
  saveStoredNurses,
} from './storage/unifiedLocalService';

export { STORAGE_KEY, NURSES_STORAGE_KEY } from './storage/unifiedLocalService';
export { createEmptyPatient, clonePatient } from './factories/patientFactory';
export { calculateStats, type CensusStatistics } from './calculations/statsCalculator';
export { formatDateDDMMYYYY, getTodayISO, formatDateForDisplay } from '@/utils/dateUtils';
export {
  getForDate as getRecordForDate,
  getPreviousDay as getPreviousDayRecord,
} from './repositories/dailyRecordRepositoryReadService';
export { save as saveRecord } from './repositories/dailyRecordRepositoryWriteService';
export { initializeDay } from './repositories/dailyRecordRepositoryInitializationService';
export { setFirestoreEnabled, isFirestoreEnabled } from './repositories/repositoryConfig';
