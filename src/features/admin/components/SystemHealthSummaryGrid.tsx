import type { SystemHealthSummary } from '@/services/admin/healthService';
import { buildSystemHealthMetricCards } from './systemHealthDashboardUtils';

export const SystemHealthSummaryGrid = ({ summary }: { summary: SystemHealthSummary }) => {
  const cards = buildSystemHealthMetricCards(summary);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
      {cards.map(card => (
        <div key={card.title} className="card p-3">
          <p className="text-[10px] font-bold uppercase text-slate-400">{card.title}</p>
          <p className={`text-2xl font-black ${card.accentClassName}`}>{card.value}</p>
          {card.detail ? <p className="text-[10px] text-slate-400">{card.detail}</p> : null}
        </div>
      ))}
    </div>
  );
};
