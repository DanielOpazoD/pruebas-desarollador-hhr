import React from 'react';
import { CalendarRange, CheckCircle2, Users } from 'lucide-react';
import clsx from 'clsx';
import type { Reminder } from '@/types';
import { formatReminderDateRange } from '@/shared/reminders/reminderPresentation';
import { getReminderRoleLabel } from '@/shared/reminders/reminderUiOptions';

interface ReminderCardProps {
  reminder: Reminder;
  unread?: boolean;
  onMarkAsRead?: (reminderId: string) => void | Promise<void>;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  unread = false,
  onMarkAsRead,
}) => {
  const rolesSummary = reminder.targetRoles.map(getReminderRoleLabel).join(', ');

  return (
    <article
      className={clsx(
        'rounded-[1.5rem] border bg-white p-4 shadow-sm transition-all',
        unread ? 'border-sky-300 shadow-sky-100/70' : 'border-slate-100'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">{reminder.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-[15px] font-medium leading-relaxed text-slate-600">
              {reminder.message}
            </p>
          </div>
        </div>

        {onMarkAsRead && unread && (
          <button
            type="button"
            onClick={() => onMarkAsRead(reminder.id)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
          >
            <CheckCircle2 size={12} />
            Visto
          </button>
        )}
      </div>

      {reminder.imageUrl && (
        <div className="mt-4 overflow-hidden rounded-[1.25rem] border border-slate-100">
          <img
            src={reminder.imageUrl}
            alt={reminder.title}
            className="h-52 w-full object-cover"
            loading="lazy"
          />
        </div>
      )}

      <div className="mt-4 grid gap-3 text-xs font-semibold text-slate-500 md:grid-cols-2">
        <div className="flex items-center gap-2">
          <CalendarRange size={14} />
          Vigencia {formatReminderDateRange(reminder.startDate, reminder.endDate)}
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} />
          {rolesSummary}
        </div>
      </div>
    </article>
  );
};
