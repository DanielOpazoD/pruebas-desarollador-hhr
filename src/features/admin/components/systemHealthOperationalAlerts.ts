import {
  DEFAULT_SYSTEM_HEALTH_THRESHOLDS,
  evaluateSystemHealthState,
} from '@/features/admin/components/systemHealthStatusPolicy';
import { UserHealthStatus } from '@/services/admin/healthService';

export type OperationalAlertSeverity = 'warning' | 'critical';

export interface OperationalAlert {
  key: string;
  title: string;
  description: string;
  severity: OperationalAlertSeverity;
  affectedUsers: string[];
  affectedCount: number;
}

export interface OperationalAlertHistoryEvent {
  key: string;
  title: string;
  severity: OperationalAlertSeverity;
  type: 'opened' | 'resolved';
  at: string;
  affectedCount: number;
}

export interface OperationalAlertSnapshotState {
  active: Record<
    string,
    { title: string; severity: OperationalAlertSeverity; affectedCount: number; updatedAt: string }
  >;
  history: OperationalAlertHistoryEvent[];
}

export const EMPTY_OPERATIONAL_ALERT_SNAPSHOT: OperationalAlertSnapshotState = {
  active: {},
  history: [],
};

const uniqueEmails = (users: UserHealthStatus[]): string[] =>
  Array.from(new Set(users.map(user => user.email).filter(Boolean)));

const byHealthLevel = (statuses: UserHealthStatus[]): UserHealthStatus[] =>
  statuses.filter(status => evaluateSystemHealthState(status).level === 'critical');

export const buildOperationalAlerts = (
  statuses: UserHealthStatus[],
  nowMs: number = Date.now()
): OperationalAlert[] => {
  if (statuses.length === 0) return [];

  const criticalUsers = byHealthLevel(statuses);
  const warningUsers = statuses.filter(
    status => evaluateSystemHealthState(status).level === 'warning'
  );
  const failedSyncUsers = statuses.filter(status => status.failedSyncTasks > 0);
  const conflictUsers = statuses.filter(status => (status.conflictSyncTasks || 0) > 0);
  const staleQueueUsers = statuses.filter(
    status =>
      (status.oldestPendingAgeMs || 0) >=
      DEFAULT_SYSTEM_HEALTH_THRESHOLDS.criticalOldestPendingAgeMs
  );
  const prolongedOfflineUsers = statuses.filter(status => {
    if (status.isOnline) return false;
    const ageMs = nowMs - new Date(status.lastSeen).getTime();
    return Number.isFinite(ageMs) && ageMs >= 15 * 60 * 1000;
  });

  const alerts: OperationalAlert[] = [];

  if (criticalUsers.length > 0) {
    alerts.push({
      key: 'critical-users',
      title: 'Usuarios en estado critico',
      description: 'Hay usuarios con riesgo alto de perdida de sincronizacion.',
      severity: 'critical',
      affectedUsers: uniqueEmails(criticalUsers),
      affectedCount: criticalUsers.length,
    });
  }

  if (failedSyncUsers.length > 0) {
    alerts.push({
      key: 'failed-sync',
      title: 'Sincronizaciones fallidas',
      description: 'Existen tareas fallidas que requieren revision de permisos o red.',
      severity: 'critical',
      affectedUsers: uniqueEmails(failedSyncUsers),
      affectedCount: failedSyncUsers.length,
    });
  }

  if (conflictUsers.length > 0) {
    alerts.push({
      key: 'sync-conflicts',
      title: 'Conflictos de sincronizacion',
      description: 'Se detectaron conflictos pendientes de resolucion o reintento.',
      severity: 'critical',
      affectedUsers: uniqueEmails(conflictUsers),
      affectedCount: conflictUsers.length,
    });
  }

  if (staleQueueUsers.length > 0) {
    alerts.push({
      key: 'stale-queue',
      title: 'Cola atascada (>= 15 min)',
      description: 'La cola de outbox mantiene antiguedad critica.',
      severity: 'warning',
      affectedUsers: uniqueEmails(staleQueueUsers),
      affectedCount: staleQueueUsers.length,
    });
  }

  if (prolongedOfflineUsers.length > 0) {
    alerts.push({
      key: 'offline-users',
      title: 'Usuarios offline prolongados',
      description: 'Usuarios sin conexion por mas de 15 minutos con sesion activa reciente.',
      severity: 'warning',
      affectedUsers: uniqueEmails(prolongedOfflineUsers),
      affectedCount: prolongedOfflineUsers.length,
    });
  }

  if (alerts.length === 0 && warningUsers.length > 0) {
    alerts.push({
      key: 'warning-users',
      title: 'Usuarios en advertencia',
      description: 'Hay degradacion leve en sincronizacion que requiere monitoreo.',
      severity: 'warning',
      affectedUsers: uniqueEmails(warningUsers),
      affectedCount: warningUsers.length,
    });
  }

  return alerts.sort((a, b) => {
    if (a.severity !== b.severity) {
      return a.severity === 'critical' ? -1 : 1;
    }
    return b.affectedCount - a.affectedCount;
  });
};

export const applyOperationalAlertsSnapshot = (
  previous: OperationalAlertSnapshotState,
  currentAlerts: OperationalAlert[],
  nowIso: string,
  maxHistoryEntries: number = 50
): OperationalAlertSnapshotState => {
  const nextActive: OperationalAlertSnapshotState['active'] = {};
  const nextHistory: OperationalAlertHistoryEvent[] = [...previous.history];

  const previousActive = previous.active;
  const currentByKey = new Map(currentAlerts.map(alert => [alert.key, alert]));

  for (const [key, alert] of currentByKey) {
    nextActive[key] = {
      title: alert.title,
      severity: alert.severity,
      affectedCount: alert.affectedCount,
      updatedAt: nowIso,
    };

    if (!previousActive[key]) {
      nextHistory.push({
        key,
        title: alert.title,
        severity: alert.severity,
        type: 'opened',
        at: nowIso,
        affectedCount: alert.affectedCount,
      });
    }
  }

  for (const [key, previousAlert] of Object.entries(previousActive)) {
    if (!currentByKey.has(key)) {
      nextHistory.push({
        key,
        title: previousAlert.title,
        severity: previousAlert.severity,
        type: 'resolved',
        at: nowIso,
        affectedCount: previousAlert.affectedCount,
      });
    }
  }

  return {
    active: nextActive,
    history: nextHistory.slice(-maxHistoryEntries),
  };
};
