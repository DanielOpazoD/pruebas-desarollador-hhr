import React from 'react';
import { BellRing, CheckCircle2 } from 'lucide-react';
import { useReminderCenter } from '@/hooks/useReminders';
import { REMINDER_TYPE_LABELS } from '@/shared/reminders/reminderUiOptions';

export const ReminderBanner: React.FC = () => {
  const { unreadReminders, openCenter, markReminderAsRead } = useReminderCenter();
  const reminder = unreadReminders[0];

  if (!reminder) return null;

  return (
    <section className="rounded-[1.75rem] border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <BellRing size={16} className="text-amber-600" />
            <span className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">
              {REMINDER_TYPE_LABELS[reminder.type]}
            </span>
          </div>
          <h3 className="mt-2 truncate text-lg font-black tracking-tight text-slate-900">
            {reminder.title}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-600">{reminder.message}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openCenter}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-slate-700 transition hover:bg-slate-50"
          >
            Ver avisos
          </button>
          <button
            type="button"
            onClick={() => void markReminderAsRead(reminder.id)}
            className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-black"
          >
            <CheckCircle2 size={14} />
            Marcar visto
          </button>
        </div>
      </div>
    </section>
  );
};
