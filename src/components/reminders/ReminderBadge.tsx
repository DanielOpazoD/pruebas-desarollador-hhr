import React from 'react';
import { BellRing } from 'lucide-react';
import clsx from 'clsx';
import { useReminderCenter } from '@/hooks/useReminders';

export const ReminderBadge: React.FC = () => {
  const { unreadCount, hasUrgentUnread, loading, openCenter } = useReminderCenter();

  return (
    <button
      type="button"
      onClick={openCenter}
      className={clsx(
        'relative flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-black transition-all',
        hasUrgentUnread
          ? 'border-rose-300 bg-rose-500/20 text-rose-50 hover:bg-rose-500/30'
          : 'border-white/20 bg-white/10 text-white/90 hover:bg-white/20'
      )}
      aria-label="Abrir avisos"
    >
      <BellRing size={14} className={hasUrgentUnread ? 'animate-pulse' : ''} />
      <span
        className={clsx(
          'min-w-[1.25rem] rounded-full px-1.5 py-0.5 text-center text-[10px] leading-none',
          unreadCount > 0 ? 'bg-white text-slate-900' : 'bg-white/10 text-white/80'
        )}
      >
        {loading ? '...' : unreadCount}
      </span>
    </button>
  );
};
