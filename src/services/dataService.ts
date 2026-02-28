/**
 * Data Service - Barrel Export
 *
 * This file provides backwards compatibility for existing imports.
 * All functionality has been refactored into focused modules.
 *
 * New code should import directly from the specific modules:
 * - storage/unifiedLocalService
 * - factories/patientFactory
 * - calculations/statsCalculator
 * - repositories/DailyRecordRepository
 * - utils/dateUtils
 */

// ============================================================================
// Storage
// ============================================================================
export {
  getStoredRecords,
  saveRecordLocal,
  getStoredNurses,
  saveStoredNurses,
} from './storage/unifiedLocalService';

export { STORAGE_KEY, NURSES_STORAGE_KEY } from './storage/unifiedLocalService';

// ============================================================================
// Factories
// ============================================================================
export { createEmptyPatient, clonePatient } from './factories/patientFactory';

// ============================================================================
// Calculations
// ============================================================================
export { calculateStats, type CensusStatistics } from './calculations/statsCalculator';

// ============================================================================
// Date Formatting
// ============================================================================
export { formatDateDDMMYYYY, getTodayISO, formatDateForDisplay } from '@/utils/dateUtils';

// ============================================================================
// Repository (for backwards compatibility)
// ============================================================================
export {
  getForDate as getRecordForDate,
  getPreviousDay as getPreviousDayRecord,
  save as saveRecord,
  initializeDay,
  setFirestoreEnabled,
  isFirestoreEnabled,
  DailyRecordRepository,
} from './repositories/DailyRecordRepository';
