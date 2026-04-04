import { describe, expect, it } from 'vitest';
import {
  resolveRemoteSyncRuntimeState,
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

  it('keeps a bootstrapping reason when auth is resolved but remote runtime is still reconnecting', () => {
    expect(
      resolveRemoteSyncRuntimeState({
        authLoading: false,
        isFirebaseConnected: false,
        firestoreSyncState: {
          mode: 'bootstrapping',
          reason: 'auth_connecting',
        },
      })
    ).toEqual({
      status: 'bootstrapping',
      reason: 'auth_connecting',
    });
  });

  it('surfaces a local_only reason when runtime was degraded by offline mode', () => {
    expect(
      resolveRemoteSyncRuntimeState({
        authLoading: false,
        isFirebaseConnected: false,
        firestoreSyncState: {
          mode: 'local_only',
          reason: 'offline',
        },
      })
    ).toEqual({
      status: 'local_only',
      reason: 'offline',
    });
  });
});
