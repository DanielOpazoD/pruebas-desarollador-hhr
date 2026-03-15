import React from 'react';
import { CalendarRange, CheckCircle2, Clock3, Users } from 'lucide-react';
import clsx from 'clsx';
import type { Reminder } from '@/types';
import {
  getReminderRoleLabel,
  REMINDER_PRIORITY_LABELS,
  REMINDER_SHIFT_OPTIONS,
  REMINDER_TYPE_LABELS,
  REMINDER_TYPE_STYLES,
} from '@/shared/reminders/reminderUiOptions';

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
  const shiftSummary = reminder.targetShifts
    .map(shift => REMINDER_SHIFT_OPTIONS.find(option => option.value === shift)?.label ?? shift)
    .join(' / ');
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
          <div className="flex flex-wrap items-center gap-2">
            {unread && <span className="h-2 w-2 rounded-full bg-sky-500" />}
            <span
              className={clsx(
                'rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em]',
                REMINDER_TYPE_STYLES[reminder.type]
              )}
            >
              {REMINDER_TYPE_LABELS[reminder.type]}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-slate-600">
              Prioridad {REMINDER_PRIORITY_LABELS[reminder.priority] ?? reminder.priority}
            </span>
          </div>

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

      <div className="mt-4 grid gap-3 text-xs font-semibold text-slate-500 md:grid-cols-3">
        <div className="flex items-center gap-2">
          <CalendarRange size={14} />
          Vigencia {reminder.startDate} a {reminder.endDate}
        </div>
        <div className="flex items-center gap-2">
          <Clock3 size={14} />
          {shiftSummary}
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} />
          {rolesSummary}
        </div>
      </div>
    </article>
  );
};
