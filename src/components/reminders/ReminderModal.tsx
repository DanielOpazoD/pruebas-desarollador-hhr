import React from 'react';
import { BellRing, CheckCircle2 } from 'lucide-react';
import { BaseModal } from '@/components/shared/BaseModal';
import { useReminderCenter } from '@/hooks/useReminders';
import { ReminderCard } from '@/components/reminders/ReminderCard';

export const ReminderModal: React.FC = () => {
  const {
    reminders,
    unreadReminders,
    unreadCount,
    isOpen,
    closeCenter,
    markAllAsRead,
    markReminderAsRead,
  } = useReminderCenter();

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={closeCenter}
      title="Avisos y recordatorios"
      icon={<BellRing size={20} />}
      headerIconColor="text-sky-600"
      size="3xl"
      variant="white"
    >
      <div className="space-y-5">
        <div className="rounded-[1.5rem] border border-sky-100 bg-sky-50/70 p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-600">
                Estado actual
              </p>
              <h3 className="mt-1 text-lg font-black tracking-tight text-slate-900">
                {unreadCount > 0
                  ? `Tienes ${unreadCount} aviso${unreadCount === 1 ? '' : 's'} pendiente${unreadCount === 1 ? '' : 's'}.`
                  : 'No tienes avisos pendientes.'}
              </h3>
            </div>
            {unreadReminders.length > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-black"
              >
                <CheckCircle2 size={14} />
                Marcar todos
              </button>
            )}
          </div>
        </div>

        {reminders.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-500">
            No hay avisos activos para tu rol y turno.
          </div>
        ) : (
          <div className="space-y-4">
            {reminders.map(reminder => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                unread={unreadReminders.some(item => item.id === reminder.id)}
                onMarkAsRead={markReminderAsRead}
              />
            ))}
          </div>
        )}
      </div>
    </BaseModal>
  );
};
