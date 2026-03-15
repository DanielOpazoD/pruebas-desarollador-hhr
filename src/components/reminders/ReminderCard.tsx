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
        'rounded-[1.75rem] border bg-white p-5 shadow-sm transition-all',
        unread ? 'border-sky-300 shadow-sky-100/70' : 'border-slate-100'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
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
            {unread && (
              <span className="rounded-full bg-sky-600 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.24em] text-white">
                Pendiente
              </span>
            )}
          </div>

          <div>
            <h3 className="text-lg font-black tracking-tight text-slate-900">{reminder.title}</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed text-slate-600">
              {reminder.message}
            </p>
          </div>
        </div>

        {onMarkAsRead && unread && (
          <button
            type="button"
            onClick={() => onMarkAsRead(reminder.id)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-black"
          >
            <CheckCircle2 size={14} />
            Marcar visto
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
