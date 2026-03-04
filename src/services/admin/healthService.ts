import { db } from '../infrastructure/db';

const HEALTH_COLLECTION = 'system_health';
const STATS_DOC = 'stats';
const USERS_SUBCOLLECTION = 'users';

export interface UserHealthStatus {
  uid: string;
  email: string;
  displayName: string;
  lastSeen: string;
  isOnline: boolean;
  isOutdated: boolean;
  pendingMutations: number;
  pendingSyncTasks: number;
  failedSyncTasks: number;
  conflictSyncTasks: number;
  retryingSyncTasks: number;
  oldestPendingAgeMs: number;
  localErrorCount: number;
  degradedLocalPersistence: boolean;
  repositoryWarningCount: number;
  slowestRepositoryOperationMs: number;
  appVersion: string;
  platform: string;
  userAgent: string;
}

export interface SystemHealthSummary {
  totalUsers: number;
  onlineUsers: number;
  offlineUsers: number;
  outdatedUsers: number;
  degradedLocalPersistenceUsers: number;
  usersWithRepositoryWarnings: number;
  usersWithSyncFailures: number;
  totalPendingSyncTasks: number;
  totalFailedSyncTasks: number;
  totalConflictSyncTasks: number;
  totalLocalErrorCount: number;
  totalRepositoryWarnings: number;
  maxSlowRepositoryOperationMs: number;
  oldestObservedPendingAgeMs: number;
}

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const toStringValue = (value: unknown, fallback = ''): string =>
  typeof value === 'string' && value.trim().length > 0 ? value : fallback;

const isHealthPermissionError = (error: unknown): boolean => {
  const authError = error as { code?: string; message?: string };
  const code = String(authError?.code || '').toLowerCase();
  const message = String(authError?.message || '').toLowerCase();
  return code.includes('permission') || message.includes('missing or insufficient permissions');
};

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
  oldestPendingAgeMs: toNumber(raw.oldestPendingAgeMs),
  localErrorCount: toNumber(raw.localErrorCount),
  degradedLocalPersistence: toBoolean(raw.degradedLocalPersistence, false),
  repositoryWarningCount: toNumber(raw.repositoryWarningCount),
  slowestRepositoryOperationMs: toNumber(raw.slowestRepositoryOperationMs),
  appVersion: toStringValue(raw.appVersion, 'unknown'),
  platform: toStringValue(raw.platform, 'unknown'),
  userAgent: toStringValue(raw.userAgent, 'unknown'),
});

export const buildSystemHealthSummary = (statuses: UserHealthStatus[]): SystemHealthSummary => ({
  totalUsers: statuses.length,
  onlineUsers: statuses.filter(status => status.isOnline).length,
  offlineUsers: statuses.filter(status => !status.isOnline).length,
  outdatedUsers: statuses.filter(status => status.isOutdated).length,
  degradedLocalPersistenceUsers: statuses.filter(status => status.degradedLocalPersistence).length,
  usersWithRepositoryWarnings: statuses.filter(status => status.repositoryWarningCount > 0).length,
  usersWithSyncFailures: statuses.filter(
    status => status.failedSyncTasks > 0 || status.conflictSyncTasks > 0
  ).length,
  totalPendingSyncTasks: statuses.reduce((sum, status) => sum + status.pendingSyncTasks, 0),
  totalFailedSyncTasks: statuses.reduce((sum, status) => sum + status.failedSyncTasks, 0),
  totalConflictSyncTasks: statuses.reduce((sum, status) => sum + status.conflictSyncTasks, 0),
  totalLocalErrorCount: statuses.reduce((sum, status) => sum + status.localErrorCount, 0),
  totalRepositoryWarnings: statuses.reduce((sum, status) => sum + status.repositoryWarningCount, 0),
  maxSlowRepositoryOperationMs: statuses.reduce(
    (max, status) => Math.max(max, status.slowestRepositoryOperationMs),
    0
  ),
  oldestObservedPendingAgeMs: statuses.reduce(
    (max, status) => Math.max(max, status.oldestPendingAgeMs),
    0
  ),
});

export const reportUserHealth = async (status: UserHealthStatus): Promise<void> => {
  try {
    const path = `${STATS_DOC}/${HEALTH_COLLECTION}/${USERS_SUBCOLLECTION}`;
    await db.setDoc(path, status.uid, {
      ...status,
      lastSeen: new Date().toISOString(),
    });
  } catch (error) {
    if (isHealthPermissionError(error)) {
      return;
    }
    console.error('[HealthService] Failed to report health:', error);
  }
};

export const subscribeToSystemHealth = (onUpdate: (data: UserHealthStatus[]) => void) => {
  const path = `${STATS_DOC}/${HEALTH_COLLECTION}/${USERS_SUBCOLLECTION}`;
  return db.subscribeQuery<Partial<UserHealthStatus>>(
    path,
    {
      orderBy: [{ field: 'lastSeen', direction: 'desc' }],
      limit: 50,
    },
    users => {
      onUpdate(users.map(normalizeUserHealthStatus));
    }
  );
};

export const getSystemHealthSnapshot = async (): Promise<UserHealthStatus[]> => {
  try {
    const path = `${STATS_DOC}/${HEALTH_COLLECTION}/${USERS_SUBCOLLECTION}`;
    const users = await db.getDocs<Partial<UserHealthStatus>>(path, {
      orderBy: [{ field: 'lastSeen', direction: 'desc' }],
      limit: 100,
    });
    return users.map(normalizeUserHealthStatus);
  } catch (error) {
    console.error('[HealthService] Failed to fetch health snapshot:', error);
    return [];
  }
};
