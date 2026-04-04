/**
 * Repository Configuration
 * Shared configuration state for repositories.
 * Extracted to avoid circular dependencies between repository modules.
 */

export type FirestoreSyncMode = 'enabled' | 'bootstrapping' | 'local_only';

export type FirestoreSyncReason =
  | 'ready'
  | 'auth_loading'
  | 'auth_connecting'
  | 'auth_unavailable'
  | 'manual_override';

export interface FirestoreSyncState {
  mode: FirestoreSyncMode;
  reason: FirestoreSyncReason;
}

export type RemoteSyncRuntimeStatus = 'ready' | 'bootstrapping' | 'local_only';

export interface ResolveRemoteSyncRuntimeStatusInput {
  authLoading: boolean;
  isFirebaseConnected: boolean;
  firestoreSyncState?: FirestoreSyncState;
}

// ============================================================================
// State
// ============================================================================

let firestoreEnabled = true;
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
  firestoreEnabled = enabled;
  firestoreSyncState = enabled
    ? {
        mode: 'enabled',
        reason: 'ready',
      }
    : {
        mode: 'local_only',
        reason: 'auth_unavailable',
      };
};

/**
 * Check if Firestore synchronization is enabled.
 */
export const isFirestoreEnabled = (): boolean => firestoreEnabled;

export const setFirestoreSyncState = (state: FirestoreSyncState): void => {
  firestoreSyncState = state;
  firestoreEnabled = state.mode !== 'local_only';
};

export const getFirestoreSyncState = (): FirestoreSyncState => firestoreSyncState;

export const resolveRemoteSyncRuntimeStatus = ({
  authLoading,
  isFirebaseConnected,
}: ResolveRemoteSyncRuntimeStatusInput): RemoteSyncRuntimeStatus => {
  if (authLoading) {
    return 'bootstrapping';
  }

  if (isFirebaseConnected) {
    return 'ready';
  }

  return 'local_only';
};

export const shouldUseRemoteSyncRuntime = (input: ResolveRemoteSyncRuntimeStatusInput): boolean =>
  resolveRemoteSyncRuntimeStatus(input) === 'ready';
