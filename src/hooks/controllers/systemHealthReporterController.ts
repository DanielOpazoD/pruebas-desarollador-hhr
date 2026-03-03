import type { UserHealthStatus } from '@/services/admin/healthService';
import type { SyncQueueTelemetry } from '@/services/storage/syncQueueService';
import type { RepositoryPerformanceSummary } from '@/services/repositories/repositoryPerformance';
import { CURRENT_SCHEMA_VERSION } from '@/constants/version';
import { BACKEND_RUNTIME_CONTRACT_VERSION } from '@/constants/runtimeContracts';

export interface BuildUserHealthStatusOptions {
  uid: string;
  email?: string | null;
  displayName?: string | null;
  isFirebaseConnected: boolean;
  isOutdated: boolean;
  mutatingCount: number;
  localErrorCount: number;
  degradedLocalPersistence: boolean;
  navigatorOnline: boolean;
  platform: string;
  userAgent: string;
  syncTelemetry: SyncQueueTelemetry;
  repositoryPerformance: RepositoryPerformanceSummary;
}

export const buildUserHealthStatus = (options: BuildUserHealthStatusOptions): UserHealthStatus => ({
  uid: options.uid,
  email: options.email || 'unknown',
  displayName: options.displayName || 'Usuario',
  lastSeen: new Date().toISOString(),
  isOnline: options.isFirebaseConnected && options.navigatorOnline,
  isOutdated: options.isOutdated,
  pendingMutations: options.mutatingCount + options.syncTelemetry.pending,
  pendingSyncTasks: options.syncTelemetry.pending,
  failedSyncTasks: options.syncTelemetry.failed,
  conflictSyncTasks: options.syncTelemetry.conflict,
  retryingSyncTasks: options.syncTelemetry.retrying,
  oldestPendingAgeMs: options.syncTelemetry.oldestPendingAgeMs,
  localErrorCount: options.localErrorCount,
  degradedLocalPersistence: options.degradedLocalPersistence,
  repositoryWarningCount: options.repositoryPerformance.warningCount,
  slowestRepositoryOperationMs: options.repositoryPerformance.slowestOperationMs,
  appVersion: `v${CURRENT_SCHEMA_VERSION} (sync-batch:${options.syncTelemetry.batchSize}, backend-contract:${BACKEND_RUNTIME_CONTRACT_VERSION})`,
  platform: options.platform,
  userAgent: options.userAgent,
});
