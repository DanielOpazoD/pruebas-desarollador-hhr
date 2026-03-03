/**
 * Services compatibility barrel.
 *
 * This file exists only for a narrow app-level surface. New code should
 * prefer direct domain imports (`@/services/auth/...`, `@/services/storage/...`,
 * `@/services/repositories/...`) instead of growing this compatibility layer.
 */

export { signIn, createUser, signOut, onAuthChange, getCurrentUser } from './auth/authService';
export type { AuthUser } from './auth/authService';

export { getAppSetting, saveAppSetting } from './settingsService';

export {
  saveRecordToFirestore,
  getRecordFromFirestore,
  getAllRecordsFromFirestore,
  getMonthRecordsFromFirestore,
  subscribeToRecord,
  isFirestoreAvailable,
} from './storage/firestoreService';

export {
  setFirestoreEnabled,
  isFirestoreEnabled,
  getForDate,
  getForDateWithMeta,
  getAvailableDates,
  getPreviousDay,
  save,
  updatePartial,
  subscribe,
  syncWithFirestore,
  initializeDay,
  copyPatientToDate,
  bridgeLegacyRecord,
  DailyRecordRepository,
} from './repositories/DailyRecordRepository';
export { ensureMonthIntegrity } from './repositories/monthIntegrity';
export { migrateFromDailyRecords } from './repositories/patientMasterMigration';
export type { IDailyRecordRepository } from './repositories/DailyRecordRepository';
export type { MonthIntegrityResult } from './repositories/monthIntegrity';

export { triggerCensusEmail } from './integrations/censusEmailService';
