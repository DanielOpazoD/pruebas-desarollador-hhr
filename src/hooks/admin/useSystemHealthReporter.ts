import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useVersion } from '@/context/VersionContext';
import { useIsMutating } from '@tanstack/react-query';
import { fetchErrorLogs } from '@/services/errorLogService';
import { reportUserHealth, UserHealthStatus } from '@/services/admin/healthService';
import { getSyncQueueTelemetry } from '@/services/storage/syncQueueService';
import { isDatabaseInFallbackMode } from '@/services/storage/indexedDBService';
import { getRepositoryPerformanceSummary } from '@/services/repositories/repositoryPerformance';
import { getOperationalTelemetrySummary } from '@/services/observability/operationalTelemetryService';
import {
  buildUserHealthStatus,
  canReportSystemHealthForRole,
} from '@/hooks/controllers/systemHealthReporterController';

const REPORT_INTERVAL_MS = 2 * 60 * 1000; // Report every 2 minutes

/**
 * Hook that periodically reports the system health status to Firestore.
 * Runs in the background and only reports if a user is logged in.
 */
export const useSystemHealthReporter = () => {
  const { user, role, isFirebaseConnected } = useAuth();
  const { isOutdated } = useVersion();
  const mutatingCount = useIsMutating();
  const lastReportTime = useRef<number>(0);

  useEffect(() => {
    if (!user || !canReportSystemHealthForRole(role)) return;

    const reportHealth = async () => {
      try {
        // Get error count from IndexedDB
        const logs = await fetchErrorLogs(100);
        const localErrorCount = logs.length;
        const syncTelemetry = await getSyncQueueTelemetry();
        const pendingSyncTasks = syncTelemetry.pending;
        const failedSyncTasks = syncTelemetry.failed;
        const conflictSyncTasks = syncTelemetry.conflict;
        const retryingSyncTasks = syncTelemetry.retrying;
        const oldestPendingAgeMs = syncTelemetry.oldestPendingAgeMs;
        const syncBatchSize = syncTelemetry.batchSize;
        const repositoryPerformance = getRepositoryPerformanceSummary();
        const operationalTelemetry = getOperationalTelemetrySummary();

        const status: UserHealthStatus = buildUserHealthStatus({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          isFirebaseConnected,
          isOutdated: !!isOutdated,
          mutatingCount,
          localErrorCount,
          degradedLocalPersistence: isDatabaseInFallbackMode(),
          navigatorOnline: navigator.onLine,
          platform: navigator.platform,
          userAgent: navigator.userAgent,
          syncTelemetry: {
            pending: pendingSyncTasks,
            failed: failedSyncTasks,
            conflict: conflictSyncTasks,
            retrying: retryingSyncTasks,
            oldestPendingAgeMs,
            batchSize: syncBatchSize,
          },
          repositoryPerformance,
          operationalTelemetry,
        });

        await reportUserHealth(status);
        lastReportTime.current = Date.now();
        // console.log('[HealthReporter] Status reported successfully');
      } catch (error) {
        console.error('[HealthReporter] Failed to report status:', error);
      }
    };

    // Immediate report on mount or when critical stats change
    reportHealth();

    // Setup interval for periodic reporting
    const interval = setInterval(() => {
      // Only report if enough time has passed (throttle)
      if (Date.now() - lastReportTime.current >= REPORT_INTERVAL_MS - 5000) {
        reportHealth();
      }
    }, REPORT_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, role, isFirebaseConnected, isOutdated, mutatingCount]);
};
