import React from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  filterVisibleReminders,
  getReminderUnreadCount,
  hasUrgentVisibleReminders,
  sortRemindersByPriority,
} from '@/shared/reminders/reminderVisibility';
import { ReminderReadService, ReminderRepository } from '@/services/reminders';
import { getCurrentShift } from '@/services/admin/attributionService';
import type { Reminder, ReminderShift } from '@/types';

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildUserName = (displayName?: string | null, email?: string | null): string =>
  displayName?.trim() || email?.trim() || 'Usuario del sistema';

interface ReminderCenterContextValue {
  reminders: Reminder[];
  unreadReminders: Reminder[];
  unreadCount: number;
  hasUrgentUnread: boolean;
  currentShift: ReminderShift;
  currentDate: string;
  isOpen: boolean;
  loading: boolean;
  isAvailable: boolean;
  openCenter: () => void;
  closeCenter: () => void;
  markReminderAsRead: (reminderId: string) => Promise<void>;
}

const ReminderCenterContext = React.createContext<ReminderCenterContextValue | undefined>(
  undefined
);

export const ReminderCenterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, role, isAuthenticated } = useAuth();
  const [reminders, setReminders] = React.useState<Reminder[]>([]);
  const [readReminderIds, setReadReminderIds] = React.useState<string[]>([]);
  const [isOpen, setIsOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [isAvailable, setIsAvailable] = React.useState(true);
  const [now, setNow] = React.useState(() => new Date());

  React.useEffect(() => {
    const timeoutId = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timeoutId);
  }, []);

  const currentDate = React.useMemo(() => formatLocalDate(now), [now]);
  const currentShift = React.useMemo(() => getCurrentShift(now), [now]);
  const visibleReminders = React.useMemo(
    () =>
      sortRemindersByPriority(
        reminders.filter(
          reminder =>
            filterVisibleReminders([reminder], {
              role,
              shift: currentShift,
              currentDate,
            }).length > 0
        )
      ),
    [currentDate, currentShift, reminders, role]
  );
  const unreadReminders = React.useMemo(
    () =>
      filterVisibleReminders(visibleReminders, {
        role,
        shift: currentShift,
        currentDate,
        readReminderIds,
      }),
    [currentDate, currentShift, readReminderIds, role, visibleReminders]
  );

  React.useEffect(() => {
    if (!isAuthenticated) {
      setReadReminderIds([]);
      setReminders([]);
      setLoading(false);
      setIsAvailable(true);
      return;
    }

    setLoading(true);
    setIsAvailable(true);
    const unsubscribe = ReminderRepository.subscribe(
      nextReminders => {
        setReminders(nextReminders);
        setLoading(false);
      },
      {
        onError: (_error, _kind) => {
          setLoading(false);
          setIsAvailable(false);
          setIsOpen(false);
        },
      }
    );

    return unsubscribe;
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!isAvailable || !user?.uid || visibleReminders.length === 0) {
      setReadReminderIds([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const results = await Promise.all(
        visibleReminders.map(async reminder => ({
          reminderId: reminder.id,
          hasRead: await ReminderReadService.hasUserReadForShiftWindow(
            reminder.id,
            user.uid,
            currentShift,
            currentDate
          ),
        }))
      );

      if (cancelled) return;
      setReadReminderIds(results.filter(result => result.hasRead).map(result => result.reminderId));
    })();

    return () => {
      cancelled = true;
    };
  }, [currentDate, currentShift, isAvailable, user?.uid, visibleReminders]);

  const markReminderAsRead = React.useCallback(
    async (reminderId: string) => {
      if (!user?.uid) return;
      if (readReminderIds.includes(reminderId)) return;

      const result = await ReminderReadService.markAsReadWithResult(
        reminderId,
        ReminderReadService.buildReceipt({
          userId: user.uid,
          userName: buildUserName(user.displayName, user.email),
          shift: currentShift,
          dateKey: currentDate,
        })
      );

      if (result.status !== 'success') {
        return;
      }

      setReadReminderIds(previous => [...previous, reminderId]);
    },
    [currentDate, currentShift, readReminderIds, user?.displayName, user?.email, user?.uid]
  );

  const value = React.useMemo<ReminderCenterContextValue>(
    () => ({
      reminders: visibleReminders,
      unreadReminders,
      unreadCount: getReminderUnreadCount(visibleReminders, {
        role,
        shift: currentShift,
        currentDate,
        readReminderIds,
      }),
      hasUrgentUnread: hasUrgentVisibleReminders(visibleReminders, {
        role,
        shift: currentShift,
        currentDate,
        readReminderIds,
      }),
      currentShift,
      currentDate,
      isOpen,
      loading,
      isAvailable,
      openCenter: () => setIsOpen(true),
      closeCenter: () => setIsOpen(false),
      markReminderAsRead,
    }),
    [
      currentDate,
      isAvailable,
      currentShift,
      isOpen,
      loading,
      markReminderAsRead,
      readReminderIds,
      role,
      unreadReminders,
      visibleReminders,
    ]
  );

  return <ReminderCenterContext.Provider value={value}>{children}</ReminderCenterContext.Provider>;
};

export const useReminderCenter = (): ReminderCenterContextValue => {
  const context = React.useContext(ReminderCenterContext);
  if (!context) {
    throw new Error('useReminderCenter must be used within a ReminderCenterProvider');
  }
  return context;
};
