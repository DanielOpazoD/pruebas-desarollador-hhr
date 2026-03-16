import type { Reminder, ReminderVisibilityContext } from '@/types/reminders';

const comparePriority = (left: Reminder, right: Reminder): number => {
  if (right.priority !== left.priority) return right.priority - left.priority;
  return right.createdAt.localeCompare(left.createdAt);
};

export const isReminderVisible = (
  reminder: Reminder,
  context: ReminderVisibilityContext
): boolean => {
  if (!reminder.isActive) return false;
  if (!context.role) return false;
  if (context.currentDate < reminder.startDate || context.currentDate > reminder.endDate) {
    return false;
  }
  if (!reminder.targetRoles.includes(context.role)) return false;
  if (!reminder.targetShifts.includes(context.shift)) return false;
  if (context.readReminderIds?.includes(reminder.id)) return false;
  return true;
};

export const filterVisibleReminders = (
  reminders: Reminder[],
  context: ReminderVisibilityContext
): Reminder[] => reminders.filter(reminder => isReminderVisible(reminder, context));

export const sortRemindersByPriority = (reminders: Reminder[]): Reminder[] =>
  [...reminders].sort(comparePriority);

export const getReminderUnreadCount = (
  reminders: Reminder[],
  context: ReminderVisibilityContext
): number => filterVisibleReminders(reminders, context).length;

export const hasUrgentVisibleReminders = (
  reminders: Reminder[],
  context: ReminderVisibilityContext
): boolean =>
  filterVisibleReminders(reminders, context).some(reminder => reminder.type === 'urgent');
