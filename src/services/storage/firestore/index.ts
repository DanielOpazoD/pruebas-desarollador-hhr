/**
 * Canonical Firestore storage entrypoint.
 *
 * This is the canonical Firestore storage surface.
 */

export {
  createFirestoreDatabaseProvider,
  firestoreDb,
} from '@/services/storage/firestore/firestoreDatabaseProvider';
export type {
  IDatabaseBatch,
  IDatabaseProvider,
  OrderByConstraint,
  QueryConstraint,
  QueryOptions,
} from '@/services/storage/firestore/firestoreDatabaseProvider';

export {
  getAvailableDatesFromFirestore,
  getAllRecordsFromFirestore,
  getMonthRecordsFromFirestore,
  getRecordFromFirestore,
  getRecordFromFirestoreDetailed,
  getRecordsRangeFromFirestore,
  isFirestoreAvailable,
  subscribeToRecord,
} from '@/services/storage/firestore/firestoreRecordQueries';

export {
  ConcurrencyError,
  deleteRecordFromFirestore,
  moveRecordToTrash,
  saveRecordToFirestore,
  updateRecordPartial,
} from '@/services/storage/firestore/firestoreRecordWrites';

export {
  getNurseCatalogFromFirestore,
  getProfessionalsCatalogFromFirestore,
  getTensCatalogFromFirestore,
  saveNurseCatalogToFirestore,
  saveProfessionalsCatalogToFirestore,
  saveTensCatalogToFirestore,
  subscribeToNurseCatalog,
  subscribeToProfessionalsCatalog,
  subscribeToTensCatalog,
} from '@/services/storage/firestore/firestoreCatalogService';
