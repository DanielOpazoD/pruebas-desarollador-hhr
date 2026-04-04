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

  it('returns local_only when Firebase is not connected and auth already resolved', () => {
    expect(
      resolveRemoteSyncRuntimeStatus({
        authLoading: false,
        isFirebaseConnected: false,
      })
    ).toBe('local_only');
  });
});
