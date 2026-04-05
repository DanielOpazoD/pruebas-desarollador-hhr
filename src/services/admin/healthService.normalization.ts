import type {
  UserHealthStatus,
  VersionUpdateReason,
} from '@/services/admin/healthService.contracts';
import type { OperationalRuntimeState } from '@/services/observability/operationalRuntimeState';
import type { FirestoreSyncReason } from '@/services/repositories/repositoryConfig';

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toStringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const validRemoteSyncReasons = new Set<FirestoreSyncReason>([
  'ready',
  'auth_loading',
  'auth_connecting',
  'auth_unavailable',
  'manual_override',
  'offline',
  'runtime_unavailable',
]);

const validVersionUpdateReasons = new Set<VersionUpdateReason>([
  'current',
  'new_build_available',
  'runtime_contract_mismatch',
  'schema_ahead_of_client',
]);

const validOperationalRuntimeStates = new Set<OperationalRuntimeState>([
  'retryable',
  'recoverable',
  'degraded',
  'blocked',
  'unauthorized',
]);

export const normalizeUserHealthStatus = (raw: Partial<UserHealthStatus>): UserHealthStatus => ({
  uid: toStringValue(raw.uid, 'unknown'),
  email: toStringValue(raw.email, 'unknown@local'),
  displayName: toStringValue(raw.displayName, 'Usuario sin nombre'),
  lastSeen: toStringValue(raw.lastSeen, new Date(0).toISOString()),
  isOnline: toBoolean(raw.isOnline, false),
  isOutdated: toBoolean(raw.isOutdated, false),
  pendingMutations: toNumber(raw.pendingMutations),
  pendingSyncTasks: toNumber(raw.pendingSyncTasks),
  failedSyncTasks: toNumber(raw.failedSyncTasks),
  conflictSyncTasks: toNumber(raw.conflictSyncTasks),
  retryingSyncTasks: toNumber(raw.retryingSyncTasks),
  syncOrphanedTasks: toNumber(raw.syncOrphanedTasks),
  oldestPendingAgeMs: toNumber(raw.oldestPendingAgeMs),
  remoteSyncReason: validRemoteSyncReasons.has(raw.remoteSyncReason as FirestoreSyncReason)
    ? raw.remoteSyncReason
    : undefined,
  versionUpdateReason: validVersionUpdateReasons.has(raw.versionUpdateReason as VersionUpdateReason)
    ? raw.versionUpdateReason
    : undefined,
  localErrorCount: toNumber(raw.localErrorCount),
  degradedLocalPersistence: toBoolean(raw.degradedLocalPersistence, false),
  repositoryWarningCount: toNumber(raw.repositoryWarningCount),
  slowestRepositoryOperationMs: toNumber(raw.slowestRepositoryOperationMs),
  operationalObservedCount: toNumber(raw.operationalObservedCount),
  operationalFailureCount: toNumber(raw.operationalFailureCount),
  operationalRetryableCount: toNumber(raw.operationalRetryableCount),
  operationalRecoverableCount: toNumber(raw.operationalRecoverableCount),
  operationalDegradedCount: toNumber(raw.operationalDegradedCount),
  operationalBlockedCount: toNumber(raw.operationalBlockedCount),
  operationalUnauthorizedCount: toNumber(raw.operationalUnauthorizedCount),
  operationalLastHourObservedCount: toNumber(raw.operationalLastHourObservedCount),
  operationalSyncObservedCount: toNumber(raw.operationalSyncObservedCount),
  operationalIndexedDbObservedCount: toNumber(raw.operationalIndexedDbObservedCount),
  operationalClinicalDocumentObservedCount: toNumber(raw.operationalClinicalDocumentObservedCount),
  operationalCreateDayObservedCount: toNumber(raw.operationalCreateDayObservedCount),
  operationalHandoffObservedCount: toNumber(raw.operationalHandoffObservedCount),
  operationalExportBackupObservedCount: toNumber(raw.operationalExportBackupObservedCount),
  operationalDailyRecordRecoveredRealtimeNullCount: toNumber(
    raw.operationalDailyRecordRecoveredRealtimeNullCount
  ),
  operationalDailyRecordConfirmedRealtimeNullCount: toNumber(
    raw.operationalDailyRecordConfirmedRealtimeNullCount
  ),
  operationalSyncReadUnavailableCount: toNumber(raw.operationalSyncReadUnavailableCount),
  operationalIndexedDbFallbackModeCount: toNumber(raw.operationalIndexedDbFallbackModeCount),
  operationalAuthBootstrapTimeoutCount: toNumber(raw.operationalAuthBootstrapTimeoutCount),
  operationalTopObservedCategory:
    typeof raw.operationalTopObservedCategory === 'string'
      ? raw.operationalTopObservedCategory
      : undefined,
  operationalTopObservedOperation:
    typeof raw.operationalTopObservedOperation === 'string'
      ? raw.operationalTopObservedOperation
      : undefined,
  latestOperationalOperation:
    typeof raw.latestOperationalOperation === 'string' ? raw.latestOperationalOperation : undefined,
  latestOperationalRuntimeState: validOperationalRuntimeStates.has(
    raw.latestOperationalRuntimeState as OperationalRuntimeState
  )
    ? raw.latestOperationalRuntimeState
    : undefined,
  latestOperationalIssueAt:
    typeof raw.latestOperationalIssueAt === 'string' ? raw.latestOperationalIssueAt : undefined,
  appVersion: toStringValue(raw.appVersion, 'unknown'),
  platform: toStringValue(raw.platform, 'unknown'),
  userAgent: toStringValue(raw.userAgent, 'unknown'),
});
