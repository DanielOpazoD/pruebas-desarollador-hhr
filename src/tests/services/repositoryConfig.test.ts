import { describe, expect, it } from 'vitest';
import {
  resolveRemoteSyncRuntimeStatus,
  type FirestoreSyncState,
} from '@/services/repositories/repositoryConfig';

describe('repositoryConfig', () => {
  it('returns ready when Firebase is connected even if a stale local_only state remains', () => {
    const staleLocalOnlyState: FirestoreSyncState = {
      mode: 'local_only',
      reason: 'auth_unavailable',
    };

    expect(
      resolveRemoteSyncRuntimeStatus({
        authLoading: false,
        isFirebaseConnected: true,
        firestoreSyncState: staleLocalOnlyState,
      })
    ).toBe('ready');
  });

  it('preserves local_only when the runtime was explicitly disabled manually', () => {
    const manualOverrideState: FirestoreSyncState = {
      mode: 'local_only',
      reason: 'manual_override',
    };

    expect(
      resolveRemoteSyncRuntimeStatus({
        authLoading: false,
        isFirebaseConnected: true,
        firestoreSyncState: manualOverrideState,
      })
    ).toBe('local_only');
  });
});
