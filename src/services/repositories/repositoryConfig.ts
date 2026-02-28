/**
 * Repository Configuration
 * Shared configuration state for repositories.
 * Extracted to avoid circular dependencies between repository modules.
 */

// ============================================================================
// State
// ============================================================================

let firestoreEnabled = true;

// ============================================================================
// API
// ============================================================================

/**
 * Enable or disable Firestore synchronization.
 * When disabled, only local IndexedDB storage is used.
 */
export const setFirestoreEnabled = (enabled: boolean): void => {
  firestoreEnabled = enabled;
};

/**
 * Check if Firestore synchronization is enabled.
 */
export const isFirestoreEnabled = (): boolean => firestoreEnabled;
