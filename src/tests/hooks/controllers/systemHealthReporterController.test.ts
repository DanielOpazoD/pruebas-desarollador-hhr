import { describe, expect, it } from 'vitest';
import { buildUserHealthStatus } from '@/hooks/controllers/systemHealthReporterController';

describe('systemHealthReporterController', () => {
  it('builds a normalized health payload with sync and repository metrics', () => {
    const status = buildUserHealthStatus({
      uid: 'u1',
      email: 'user@example.com',
      displayName: 'User',
      isFirebaseConnected: true,
      isOutdated: false,
      mutatingCount: 2,
      localErrorCount: 3,
      degradedLocalPersistence: true,
      navigatorOnline: true,
      platform: 'MacIntel',
      userAgent: 'Vitest',
      syncTelemetry: {
        pending: 4,
        failed: 1,
        conflict: 2,
        retrying: 1,
        oldestPendingAgeMs: 9000,
        batchSize: 25,
      },
      repositoryPerformance: {
        totalRecorded: 12,
        warningCount: 3,
        slowestOperationMs: 480,
        slowestOperation: 'getForDate',
        latestWarningAt: '2026-03-01T00:00:00.000Z',
        recentWarningOperations: [],
      },
    });

    expect(status.pendingMutations).toBe(6);
    expect(status.pendingSyncTasks).toBe(4);
    expect(status.failedSyncTasks).toBe(1);
    expect(status.degradedLocalPersistence).toBe(true);
    expect(status.repositoryWarningCount).toBe(3);
    expect(status.slowestRepositoryOperationMs).toBe(480);
    expect(status.appVersion).toContain('sync-batch:25');
  });
});
