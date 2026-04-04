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
  | 'manual_override'
  | 'offline'
  | 'runtime_unavailable';

export interface FirestoreSyncState {
  mode: FirestoreSyncMode;
  reason: FirestoreSyncReason;
}

export type RemoteSyncRuntimeStatus = 'ready' | 'bootstrapping' | 'local_only';

export interface RemoteSyncRuntimeState {
  status: RemoteSyncRuntimeStatus;
  reason: FirestoreSyncReason;
}

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

export const resolveRemoteSyncRuntimeState = ({
  authLoading,
  isFirebaseConnected,
  firestoreSyncState,
}: ResolveRemoteSyncRuntimeStatusInput): RemoteSyncRuntimeState => {
  if (authLoading) {
    return {
      status: 'bootstrapping',
      reason: 'auth_loading',
    };
  }

  if (isFirebaseConnected) {
    return {
      status: 'ready',
      reason: 'ready',
    };
  }

  if (firestoreSyncState?.mode === 'bootstrapping') {
    return {
      status: 'bootstrapping',
      reason: firestoreSyncState.reason,
    };
  }

  if (firestoreSyncState?.mode === 'enabled') {
    return {
      status: 'bootstrapping',
      reason: firestoreSyncState.reason === 'ready' ? 'auth_connecting' : firestoreSyncState.reason,
    };
  }

  return {
    status: 'local_only',
    reason: firestoreSyncState?.reason || 'auth_unavailable',
  };
};

export const resolveRemoteSyncRuntimeStatus = (
  input: ResolveRemoteSyncRuntimeStatusInput
): RemoteSyncRuntimeStatus => resolveRemoteSyncRuntimeState(input).status;

export const shouldUseRemoteSyncRuntime = (input: ResolveRemoteSyncRuntimeStatusInput): boolean =>
  resolveRemoteSyncRuntimeState(input).status === 'ready';
