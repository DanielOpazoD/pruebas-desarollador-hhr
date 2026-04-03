/**
 * Canonical sync queue entrypoint.
 *
 * This is the canonical sync queue surface.
 */

export {
  ensureSyncQueueOnlineListener,
  getSyncQueueDomainMetrics,
  getSyncQueueStats,
  getSyncQueueTelemetry,
  isConflictSyncError,
  isRetryableSyncError,
  listRecentSyncQueueOperations,
  processSyncQueue,
  queueSyncTask,
} from '@/services/storage/sync/publicSyncQueue';

export type {
  SyncQueueDomainMetrics,
  SyncQueueOperationSnapshot,
  SyncQueueTelemetry,
} from '@/services/storage/sync/publicSyncQueue';
