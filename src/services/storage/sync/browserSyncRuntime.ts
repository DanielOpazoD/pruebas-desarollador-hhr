import type { SyncRuntimePort } from '@/services/storage/sync/syncQueuePorts';
import { getStoredSessionOwnerKey } from '@/services/storage/sessionScopedStorageService';

export const createBrowserSyncRuntime = (): SyncRuntimePort => ({
  isOnline: () => typeof navigator !== 'undefined' && navigator.onLine,
  onOnline: callback => {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', callback);
  },
  getOwnerKey: () => getStoredSessionOwnerKey(),
});
