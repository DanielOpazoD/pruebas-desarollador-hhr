import React from 'react';
import { BellRing } from 'lucide-react';
import { BaseModal } from '@/components/shared/BaseModal';
import { useReminderCenter } from '@/hooks/useReminders';
import { ReminderCard } from '@/components/reminders/ReminderCard';

export const ReminderModal: React.FC = () => {
  const {
    reminders,
    unreadReminders,
    unreadCount,
    isOpen,
    isAvailable,
    closeCenter,
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
      <div className="space-y-4">
        {!isAvailable ? (
          <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-10 text-center text-sm font-semibold text-amber-800">
            No fue posible cargar los avisos. Revisa permisos vigentes o despliegue de rules.
          </div>
        ) : reminders.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-slate-200 bg-slate-50 p-10 text-center text-sm font-semibold text-slate-500">
            No hay avisos activos para tu rol y turno.
          </div>
        ) : (
          <div className="space-y-3">
            {unreadCount > 0 && (
              <div className="flex items-center justify-end">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  {unreadCount}
                </div>
              </div>
            )}
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
