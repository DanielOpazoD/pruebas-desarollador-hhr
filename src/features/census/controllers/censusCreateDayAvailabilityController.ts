export const COPY_PREVIOUS_DAY_UNLOCK_HOUR = 8;

export interface CreateDayCopyAvailability {
  isCopyLocked: boolean;
  unlockAt: Date | null;
  remainingMs: number;
  countdownLabel: string | null;
}

const buildLocalIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const formatCopyUnlockCountdown = (remainingMs: number): string => {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds].map(value => String(value).padStart(2, '0')).join(':');
};

export const resolveCreateDayCopyAvailability = (
  currentDateString: string,
  now: Date = new Date()
): CreateDayCopyAvailability => {
  if (currentDateString !== buildLocalIsoDate(now)) {
    return {
      isCopyLocked: false,
      unlockAt: null,
      remainingMs: 0,
      countdownLabel: null,
    };
  }

  const unlockAt = new Date(now);
  unlockAt.setHours(COPY_PREVIOUS_DAY_UNLOCK_HOUR, 0, 0, 0);
  const remainingMs = Math.max(0, unlockAt.getTime() - now.getTime());
  const isCopyLocked = remainingMs > 0;

  return {
    isCopyLocked,
    unlockAt,
    remainingMs,
    countdownLabel: isCopyLocked ? formatCopyUnlockCountdown(remainingMs) : null,
  };
};
