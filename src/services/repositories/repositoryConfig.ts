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

export const resolveRemoteSyncRuntimeStatus = ({
  authLoading,
  isFirebaseConnected,
  firestoreSyncState: state = getFirestoreSyncState(),
}: ResolveRemoteSyncRuntimeStatusInput): RemoteSyncRuntimeStatus => {
  if (authLoading || state.mode === 'bootstrapping') {
    return 'bootstrapping';
  }

  if (state.mode === 'local_only' && state.reason === 'manual_override') {
    return 'local_only';
  }

  if (isFirebaseConnected) {
    return 'ready';
  }

  return 'local_only';
};

export const shouldUseRemoteSyncRuntime = (input: ResolveRemoteSyncRuntimeStatusInput): boolean =>
  resolveRemoteSyncRuntimeStatus(input) === 'ready';
