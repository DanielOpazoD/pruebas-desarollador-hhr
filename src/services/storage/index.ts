// Storage services barrel file.
// Prefer importing specific modules for new code; this barrel remains for stable public access.
export * from './firestoreService';
// Legacy facade kept for backwards compatibility.
export * as LocalStorage from './localStorageService';
// Preferred app-level local access facade.
export * as LocalPersistence from './unifiedLocalService';
export * from './indexedDBService';
