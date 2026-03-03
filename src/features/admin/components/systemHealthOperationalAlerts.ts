import { evaluateSystemHealthState } from '@/features/admin/components/systemHealthStatusPolicy';
import type { UserHealthStatus } from '@/services/admin/healthService';
import {
  DEFAULT_SYSTEM_HEALTH_THRESHOLDS,
  PROLONGED_OFFLINE_USER_AGE_MS,
  SYSTEM_HEALTH_ALERT_SLA_MINUTES,
} from '@/services/admin/systemHealthOperationalBudgets';

export type OperationalAlertSeverity = 'warning' | 'critical';

export interface OperationalAlert {
  key: string;
  title: string;
  description: string;
  severity: OperationalAlertSeverity;
  recommendedAction: string;
  slaMinutes: number;
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
    return Number.isFinite(ageMs) && ageMs >= PROLONGED_OFFLINE_USER_AGE_MS;
  });

  const alerts: OperationalAlert[] = [];

  if (criticalUsers.length > 0) {
    alerts.push({
      key: 'critical-users',
      title: 'Usuarios en estado critico',
      description: 'Hay usuarios con riesgo alto de perdida de sincronizacion.',
      severity: 'critical',
      recommendedAction:
        'Contactar al usuario y ejecutar limpieza local + reintento de sincronizacion en menos de 10 minutos.',
      slaMinutes: SYSTEM_HEALTH_ALERT_SLA_MINUTES.criticalUsers,
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
      recommendedAction:
        'Verificar permisos Firestore/Storage y reintentar cola. Si persiste, escalar a soporte tecnico.',
      slaMinutes: SYSTEM_HEALTH_ALERT_SLA_MINUTES.failedSync,
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
      recommendedAction:
        'Revisar panel de conflictos, confirmar merge sugerido y reintentar sincronizacion inmediatamente.',
      slaMinutes: SYSTEM_HEALTH_ALERT_SLA_MINUTES.syncConflicts,
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
      recommendedAction:
        'Solicitar reintento de cola y validar conectividad de red del equipo afectado.',
      slaMinutes: SYSTEM_HEALTH_ALERT_SLA_MINUTES.staleQueue,
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
      recommendedAction:
        'Validar conectividad local y confirmar que no existan cambios pendientes antes de cerrar sesion.',
      slaMinutes: SYSTEM_HEALTH_ALERT_SLA_MINUTES.offlineUsers,
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
      recommendedAction:
        'Monitorear evolucion y escalar si la alerta permanece por mas de 30 minutos.',
      slaMinutes: SYSTEM_HEALTH_ALERT_SLA_MINUTES.warningUsers,
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
