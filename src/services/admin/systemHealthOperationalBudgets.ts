export interface SystemHealthThresholds {
  warningOldestPendingAgeMs: number;
  criticalOldestPendingAgeMs: number;
  warningRetryingSyncTasks: number;
  criticalRetryingSyncTasks: number;
  warningPendingMutations: number;
  criticalPendingMutations: number;
  warningLocalErrorCount: number;
  criticalLocalErrorCount: number;
  warningRepositoryWarningCount: number;
  criticalRepositoryWarningCount: number;
  warningSlowRepositoryOperationMs: number;
  criticalSlowRepositoryOperationMs: number;
}

export const DEFAULT_SYSTEM_HEALTH_THRESHOLDS: SystemHealthThresholds = {
  warningOldestPendingAgeMs: 300000,
  criticalOldestPendingAgeMs: 900000,
  warningRetryingSyncTasks: 1,
  criticalRetryingSyncTasks: 3,
  warningPendingMutations: 1,
  criticalPendingMutations: 8,
  warningLocalErrorCount: 1,
  criticalLocalErrorCount: 15,
  warningRepositoryWarningCount: 1,
  criticalRepositoryWarningCount: 5,
  warningSlowRepositoryOperationMs: 350,
  criticalSlowRepositoryOperationMs: 800,
};

export const PROLONGED_OFFLINE_USER_AGE_MS = 900000;

export const SYSTEM_HEALTH_ALERT_SLA_MINUTES = {
  criticalUsers: 10,
  failedSync: 10,
  syncConflicts: 15,
  staleQueue: 30,
  offlineUsers: 30,
  warningUsers: 45,
} as const;
