/**
 * Repository Configuration
 * Shared configuration state for repositories.
 * Extracted to avoid circular dependencies between repository modules.
 */

export type FirestoreSyncMode = 'enabled' | 'bootstrapping' | 'local_only';

export type FirestoreSyncReason = 'ready' | 'auth_loading' | 'auth_unavailable' | 'manual_override';

export interface FirestoreSyncState {
  mode: FirestoreSyncMode;
  reason: FirestoreSyncReason;
}

// ============================================================================
// State
// ============================================================================

let firestoreSyncState: FirestoreSyncState = {
  mode: 'enabled',
  reason: 'ready',
};

// ============================================================================
// API
// ============================================================================

/**
 * Enable or disable Firestore synchronization.
 * When disabled, only local IndexedDB storage is used.
 */
export const setFirestoreEnabled = (enabled: boolean): void => {
  firestoreSyncState = enabled
    ? {
        mode: 'enabled',
        reason: 'ready',
      }
    : {
        mode: 'local_only',
        reason: 'manual_override',
      };
};

/**
 * Check if Firestore synchronization is enabled.
 */
export const isFirestoreEnabled = (): boolean => firestoreSyncState.mode === 'enabled';

export const setFirestoreSyncState = (state: FirestoreSyncState): void => {
  firestoreSyncState = state;
};

export const getFirestoreSyncState = (): FirestoreSyncState => firestoreSyncState;
