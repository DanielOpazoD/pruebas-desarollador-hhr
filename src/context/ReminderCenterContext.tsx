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

const AUTO_OPEN_PREFIX = 'hhr.reminders.auto-open';

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const buildAutoOpenKey = (userId: string, shift: ReminderShift, currentDate: string): string =>
  `${AUTO_OPEN_PREFIX}:${userId}:${currentDate}:${shift}`;

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
  openCenter: () => void;
  closeCenter: () => void;
  markReminderAsRead: (reminderId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
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
      return;
    }

    setLoading(true);
    const unsubscribe = ReminderRepository.subscribe(nextReminders => {
      setReminders(nextReminders);
      setLoading(false);
    });

    return unsubscribe;
  }, [isAuthenticated]);

  React.useEffect(() => {
    if (!user?.uid || visibleReminders.length === 0) {
      setReadReminderIds([]);
      return;
    }

    let cancelled = false;
    void (async () => {
      const results = await Promise.all(
        visibleReminders.map(async reminder => ({
          reminderId: reminder.id,
          hasRead: await ReminderReadService.hasUserRead(reminder.id, user.uid),
        }))
      );

      if (cancelled) return;
      setReadReminderIds(results.filter(result => result.hasRead).map(result => result.reminderId));
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid, visibleReminders]);

  const markReminderAsRead = React.useCallback(
    async (reminderId: string) => {
      if (!user?.uid) return;
      if (readReminderIds.includes(reminderId)) return;

      await ReminderReadService.markAsRead(
        reminderId,
        ReminderReadService.buildReceipt({
          userId: user.uid,
          userName: buildUserName(user.displayName, user.email),
          shift: currentShift,
        })
      );

      setReadReminderIds(previous => [...previous, reminderId]);
    },
    [currentShift, readReminderIds, user?.displayName, user?.email, user?.uid]
  );

  const markAllAsRead = React.useCallback(async () => {
    await Promise.all(unreadReminders.map(reminder => markReminderAsRead(reminder.id)));
  }, [markReminderAsRead, unreadReminders]);

  React.useEffect(() => {
    if (!user?.uid || unreadReminders.length === 0 || isOpen) return;

    const autoOpenKey = buildAutoOpenKey(user.uid, currentShift, currentDate);
    if (window.localStorage.getItem(autoOpenKey) === '1') return;

    window.localStorage.setItem(autoOpenKey, '1');
    setIsOpen(true);
  }, [currentDate, currentShift, isOpen, unreadReminders.length, user?.uid]);

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
      openCenter: () => setIsOpen(true),
      closeCenter: () => setIsOpen(false),
      markReminderAsRead,
      markAllAsRead,
    }),
    [
      currentDate,
      currentShift,
      isOpen,
      loading,
      markAllAsRead,
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
