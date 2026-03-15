import React from 'react';
import { ChevronRight, Dot } from 'lucide-react';
import clsx from 'clsx';
import { useReminderCenter } from '@/hooks/useReminders';

export const ReminderInfoPanel: React.FC = () => {
  const { unreadReminders, hasUrgentUnread, openCenter } = useReminderCenter();
  const highlightedReminder = unreadReminders[0];

  return (
    <button
      type="button"
      onClick={openCenter}
      className={clsx(
        'card flex h-[83px] w-[112px] shrink-0 self-start flex-col justify-between px-2 py-1.5 text-left transition-colors',
        'border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-50/80 hover:border-amber-300'
      )}
      aria-label="Abrir avisos del turno"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex h-[11px] items-center">
          {highlightedReminder ? (
            <div
              className={clsx(
                'h-2 w-2 rounded-full',
                hasUrgentUnread ? 'bg-rose-500' : 'bg-amber-400'
              )}
            />
          ) : (
            <div className="h-1.5 w-6 rounded-full bg-slate-200" />
          )}
        </div>
        <div
          className={clsx(
            'mt-px h-2.5 w-2.5 rounded-full',
            highlightedReminder
              ? hasUrgentUnread
                ? 'bg-rose-500'
                : 'bg-amber-400'
              : 'bg-slate-200'
          )}
        />
      </div>

      <div
        className={clsx(
          'flex flex-1 items-center justify-center rounded-xl border border-dashed',
          highlightedReminder ? 'border-amber-200/80 bg-white/75' : 'border-slate-200 bg-white/70'
        )}
      >
        {highlightedReminder ? (
          <div className="flex items-center text-amber-500">
            <Dot size={16} />
            <Dot size={16} className="-ml-2" />
            <Dot size={16} className="-ml-2" />
          </div>
        ) : (
          <div className="h-1.5 w-8 rounded-full bg-slate-200" />
        )}
      </div>

      <div className="flex items-center justify-end text-slate-700">
        <ChevronRight size={13} />
      </div>
    </button>
  );
};
