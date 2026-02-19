import { useMemo } from 'react';
import clsx from 'clsx';
import { AlertTriangle, History } from 'lucide-react';
import { UserHealthStatus } from '@/services/admin/healthService';
import {
  EMPTY_OPERATIONAL_ALERT_SNAPSHOT,
  applyOperationalAlertsSnapshot,
  buildOperationalAlerts,
  OperationalAlertSnapshotState,
} from '@/features/admin/components/systemHealthOperationalAlerts';

const SNAPSHOT_KEY = 'hhr_system_health_alert_snapshot_v1';

const parseSnapshot = (raw: string | null): OperationalAlertSnapshotState => {
  if (!raw) return EMPTY_OPERATIONAL_ALERT_SNAPSHOT;
  try {
    const parsed = JSON.parse(raw) as OperationalAlertSnapshotState;
    if (!parsed || typeof parsed !== 'object') return EMPTY_OPERATIONAL_ALERT_SNAPSHOT;
    return {
      active: parsed.active || {},
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return EMPTY_OPERATIONAL_ALERT_SNAPSHOT;
  }
};

export const SystemHealthAlertsPanel = ({ stats }: { stats: UserHealthStatus[] }) => {
  const alerts = useMemo(() => buildOperationalAlerts(stats), [stats]);

  const snapshot: OperationalAlertSnapshotState = useMemo(() => {
    if (typeof window === 'undefined') return EMPTY_OPERATIONAL_ALERT_SNAPSHOT;
    const previous = parseSnapshot(window.localStorage.getItem(SNAPSHOT_KEY));
    const nowIso = new Date().toISOString();
    const next = applyOperationalAlertsSnapshot(previous, alerts, nowIso);
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(next));
    return next;
  }, [alerts]);

  const history = snapshot.history.slice(-8).reverse();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-black tracking-wide text-slate-900">Alertas Operativas</h3>
          <p className="mt-1 text-xs text-slate-600">
            Eventos automaticos para triage tecnico en soporte.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-700">
          {alerts.length} activas
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {alerts.length === 0 ? (
          <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            Sin alertas activas.
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.key}
              className={clsx(
                'rounded-lg border px-3 py-2 text-xs',
                alert.severity === 'critical'
                  ? 'border-red-200 bg-red-50 text-red-800'
                  : 'border-amber-200 bg-amber-50 text-amber-800'
              )}
            >
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle size={14} />
                <span>{alert.title}</span>
                <span className="ml-auto rounded bg-white/60 px-2 py-0.5 text-[10px]">
                  {alert.affectedCount} usuario(s)
                </span>
              </div>
              <p className="mt-1">{alert.description}</p>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-600">
          <History size={12} /> Historial reciente
        </div>
        {history.length === 0 ? (
          <p className="text-xs text-slate-500">Sin eventos historicos registrados.</p>
        ) : (
          <ul className="space-y-1.5">
            {history.map(event => (
              <li key={`${event.key}:${event.at}:${event.type}`} className="text-xs text-slate-700">
                <span
                  className={clsx(
                    'mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold',
                    event.type === 'opened'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-emerald-100 text-emerald-700'
                  )}
                >
                  {event.type === 'opened' ? 'ABRE' : 'CIERRA'}
                </span>
                {event.title} ({event.affectedCount}) -{' '}
                {new Date(event.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
