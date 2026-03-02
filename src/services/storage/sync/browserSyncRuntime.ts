import type { SyncRuntimePort } from '@/services/storage/sync/syncQueuePorts';

export const createBrowserSyncRuntime = (): SyncRuntimePort => ({
  isOnline: () => typeof navigator !== 'undefined' && navigator.onLine,
  onOnline: callback => {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', callback);
  },
});
