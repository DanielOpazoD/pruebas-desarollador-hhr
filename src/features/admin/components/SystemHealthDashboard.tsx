import { useEffect, useState } from 'react';
import { RefreshCw, Search, Users } from 'lucide-react';
import {
  buildSystemHealthSummary,
  subscribeToSystemHealth,
  type UserHealthStatus,
} from '@/services/admin/healthService';
import { DailyOpsChecklistCard } from './DailyOpsChecklistCard';
import { SystemHealthAlertsPanel } from './SystemHealthAlertsPanel';
import { SystemHealthSummaryGrid } from './SystemHealthSummaryGrid';
import { SystemHealthUserCard } from './SystemHealthUserCard';
import { filterSystemHealthStats } from './systemHealthDashboardUtils';

export const SystemHealthDashboard = () => {
  const [stats, setStats] = useState<UserHealthStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToSystemHealth(data => {
      setStats(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredStats = filterSystemHealthStats(stats, searchTerm);
  const summary = buildSystemHealthSummary(stats);

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      <DailyOpsChecklistCard />
      <SystemHealthAlertsPanel stats={stats} />

      <SystemHealthSummaryGrid summary={summary} />

      <div className="flex justify-end">
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Buscar usuario..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40">
          <RefreshCw className="animate-spin text-medical-500 mb-4" size={40} />
          <p className="text-slate-400 font-medium animate-pulse">
            Cargando telemetría de usuarios...
          </p>
        </div>
      ) : filteredStats.length === 0 ? (
        <div className="card p-20 flex flex-col items-center justify-center text-slate-400">
          <Users size={48} className="mb-4 opacity-20" />
          <p className="text-lg font-medium">No hay datos de salud disponibles.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStats.map(user => (
            <SystemHealthUserCard key={user.uid} user={user} />
          ))}
        </div>
      )}
    </div>
  );
};
