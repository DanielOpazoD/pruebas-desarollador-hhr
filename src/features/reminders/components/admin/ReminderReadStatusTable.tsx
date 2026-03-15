import React from 'react';
import { BellRing } from 'lucide-react';
import { BaseModal } from '@/components/shared/BaseModal';
import type { Reminder, ReminderReadReceipt } from '@/types';

interface ReminderReadStatusTableProps {
  reminder: Reminder | null;
  receipts: ReminderReadReceipt[];
  loading: boolean;
  onClose: () => void;
}

export const ReminderReadStatusTable: React.FC<ReminderReadStatusTableProps> = ({
  reminder,
  receipts,
  loading,
  onClose,
}) => {
  return (
    <BaseModal
      isOpen={Boolean(reminder)}
      onClose={onClose}
      title={reminder ? `Lecturas: ${reminder.title}` : 'Lecturas'}
      icon={<BellRing size={20} />}
      headerIconColor="text-sky-600"
      size="xl"
      variant="white"
    >
      {loading ? (
        <div className="py-10 text-center text-sm font-semibold text-slate-500">Cargando...</div>
      ) : receipts.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
          Todavia no hay lecturas registradas para este aviso.
        </div>
      ) : (
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-100">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                  Fecha turno
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                  Turno
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                  Leido en
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {receipts.map(receipt => (
                <tr key={`${receipt.userId}-${receipt.readAt}`}>
                  <td className="px-4 py-3 font-semibold text-slate-700">{receipt.userName}</td>
                  <td className="px-4 py-3 font-semibold text-slate-500">
                    {receipt.dateKey ?? 'Legacy'}
                  </td>
                  <td className="px-4 py-3 font-semibold capitalize text-slate-500">
                    {receipt.shift}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-500">{receipt.readAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </BaseModal>
  );
};
