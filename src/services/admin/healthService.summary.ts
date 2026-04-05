import type {
  SystemHealthSummary,
  UserHealthStatus,
} from '@/services/admin/healthService.contracts';
import type { OperationalRuntimeState } from '@/services/observability/operationalRuntimeState';

const topCount = <T extends string>(values: T[]): T | undefined => {
  if (values.length === 0) return undefined;
  const counts = values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] as T | undefined;
};

export const buildSystemHealthSummary = (statuses: UserHealthStatus[]): SystemHealthSummary => {
  const latestOperationalIssueAt = statuses
    .map(status => status.latestOperationalIssueAt)
    .filter((value): value is string => typeof value === 'string' && value.length > 0)
    .sort()
    .at(-1);

  const topOperationalCategory = topCount(
    statuses
      .map(status => status.operationalTopObservedCategory)
      .filter((value): value is string => Boolean(value))
  );
  const topOperationalOperation = topCount(
    statuses
      .map(status => status.operationalTopObservedOperation)
      .filter((value): value is string => Boolean(value))
  );
  const topOperationalRuntimeState = topCount(
    statuses
      .map(status => status.latestOperationalRuntimeState)
      .filter((value): value is OperationalRuntimeState => Boolean(value))
  );

  return {
    totalUsers: statuses.length,
    onlineUsers: statuses.filter(status => status.isOnline).length,
    offlineUsers: statuses.filter(status => !status.isOnline).length,
    outdatedUsers: statuses.filter(status => status.isOutdated).length,
    degradedLocalPersistenceUsers: statuses.filter(status => status.degradedLocalPersistence)
      .length,
    usersWithRepositoryWarnings: statuses.filter(status => status.repositoryWarningCount > 0)
      .length,
    usersWithSyncFailures: statuses.filter(
      status => status.failedSyncTasks > 0 || status.conflictSyncTasks > 0
    ).length,
    totalPendingSyncTasks: statuses.reduce((sum, status) => sum + status.pendingSyncTasks, 0),
    totalFailedSyncTasks: statuses.reduce((sum, status) => sum + status.failedSyncTasks, 0),
    totalConflictSyncTasks: statuses.reduce((sum, status) => sum + status.conflictSyncTasks, 0),
    totalSyncOrphanedTasks: statuses.reduce(
      (sum, status) => sum + (status.syncOrphanedTasks || 0),
      0
    ),
    totalLocalErrorCount: statuses.reduce((sum, status) => sum + status.localErrorCount, 0),
    totalRepositoryWarnings: statuses.reduce(
      (sum, status) => sum + status.repositoryWarningCount,
      0
    ),
    maxSlowRepositoryOperationMs: statuses.reduce(
      (max, status) => Math.max(max, status.slowestRepositoryOperationMs),
      0
    ),
    oldestObservedPendingAgeMs: statuses.reduce(
      (max, status) => Math.max(max, status.oldestPendingAgeMs),
      0
    ),
    totalOperationalObservedCount: statuses.reduce(
      (sum, status) => sum + status.operationalObservedCount,
      0
    ),
    totalOperationalFailureCount: statuses.reduce(
      (sum, status) => sum + status.operationalFailureCount,
      0
    ),
    totalOperationalRetryableCount: statuses.reduce(
      (sum, status) => sum + status.operationalRetryableCount,
      0
    ),
    totalOperationalRecoverableCount: statuses.reduce(
      (sum, status) => sum + status.operationalRecoverableCount,
      0
    ),
    totalOperationalDegradedCount: statuses.reduce(
      (sum, status) => sum + status.operationalDegradedCount,
      0
    ),
    totalOperationalBlockedCount: statuses.reduce(
      (sum, status) => sum + status.operationalBlockedCount,
      0
    ),
    totalOperationalUnauthorizedCount: statuses.reduce(
      (sum, status) => sum + status.operationalUnauthorizedCount,
      0
    ),
    totalOperationalLastHourObservedCount: statuses.reduce(
      (sum, status) => sum + status.operationalLastHourObservedCount,
      0
    ),
    totalOperationalSyncObservedCount: statuses.reduce(
      (sum, status) => sum + status.operationalSyncObservedCount,
      0
    ),
    totalOperationalIndexedDbObservedCount: statuses.reduce(
      (sum, status) => sum + status.operationalIndexedDbObservedCount,
      0
    ),
    totalOperationalClinicalDocumentObservedCount: statuses.reduce(
      (sum, status) => sum + status.operationalClinicalDocumentObservedCount,
      0
    ),
    totalOperationalCreateDayObservedCount: statuses.reduce(
      (sum, status) => sum + status.operationalCreateDayObservedCount,
      0
    ),
    totalOperationalHandoffObservedCount: statuses.reduce(
      (sum, status) => sum + status.operationalHandoffObservedCount,
      0
    ),
    totalOperationalExportBackupObservedCount: statuses.reduce(
      (sum, status) => sum + status.operationalExportBackupObservedCount,
      0
    ),
    totalOperationalDailyRecordRecoveredRealtimeNullCount: statuses.reduce(
      (sum, status) => sum + (status.operationalDailyRecordRecoveredRealtimeNullCount || 0),
      0
    ),
    totalOperationalDailyRecordConfirmedRealtimeNullCount: statuses.reduce(
      (sum, status) => sum + (status.operationalDailyRecordConfirmedRealtimeNullCount || 0),
      0
    ),
    totalOperationalSyncReadUnavailableCount: statuses.reduce(
      (sum, status) => sum + (status.operationalSyncReadUnavailableCount || 0),
      0
    ),
    totalOperationalIndexedDbFallbackModeCount: statuses.reduce(
      (sum, status) => sum + (status.operationalIndexedDbFallbackModeCount || 0),
      0
    ),
    totalOperationalAuthBootstrapTimeoutCount: statuses.reduce(
      (sum, status) => sum + (status.operationalAuthBootstrapTimeoutCount || 0),
      0
    ),
    usersWithSyncOwnershipDrift: statuses.filter(status => (status.syncOrphanedTasks || 0) > 0)
      .length,
    usersWithRuntimeContractMismatch: statuses.filter(
      status => status.versionUpdateReason === 'runtime_contract_mismatch'
    ).length,
    usersWithSchemaAheadClient: statuses.filter(
      status => status.versionUpdateReason === 'schema_ahead_of_client'
    ).length,
    topOperationalCategory,
    topOperationalOperation,
    topOperationalRuntimeState,
    usersWithRecentOperationalIssues: statuses.filter(status => !!status.latestOperationalIssueAt)
      .length,
    latestOperationalIssueAt,
  };
};
