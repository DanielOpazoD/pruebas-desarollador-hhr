import type { ReminderReadReceipt } from '@/types/reminders';
import { REMINDER_PRIORITY_LABELS } from '@/shared/reminders/reminderUiOptions';

export const formatReminderShiftLabel = (
  shift: Pick<ReminderReadReceipt, 'shift'>['shift']
): string => (shift === 'day' ? 'Dia' : 'Noche');

export const formatReminderDate = (value: string): string => {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return value;
  return `${day}-${month}-${year}`;
};

export const formatReminderDateRange = (startDate: string, endDate: string): string =>
  `${formatReminderDate(startDate)} a ${formatReminderDate(endDate)}`;

export const formatReminderPriorityLabel = (priority: number): string =>
  `Prioridad ${REMINDER_PRIORITY_LABELS[priority] ?? priority}`;

export const formatReminderReceiptDate = (receipt: Pick<ReminderReadReceipt, 'dateKey'>): string =>
  receipt.dateKey ? formatReminderDate(receipt.dateKey) : 'Legacy';

export const formatReminderReadWindowLabel = (
  receipt: Pick<ReminderReadReceipt, 'dateKey' | 'shift'>
): string => `${formatReminderReceiptDate(receipt)} / ${formatReminderShiftLabel(receipt.shift)}`;
