import React from 'react';
import clsx from 'clsx';
import {
  resolveDateStripDayWindow,
  resolveIsFutureDayBlocked,
} from '@/components/layout/date-strip/dateStripDayWindowController';

interface DateStripDayButtonsProps {
  selectedDay: number;
  setSelectedDay: React.Dispatch<React.SetStateAction<number>>;
  daysInMonth: number;
  existingDaysInMonth: number[];
  selectedYear: number;
  selectedMonth: number;
  isCurrentMonth: boolean;
  today: Date;
}

export const DateStripDayButtons: React.FC<DateStripDayButtonsProps> = ({
  selectedDay,
  setSelectedDay,
  daysInMonth,
  existingDaysInMonth,
  selectedYear,
  selectedMonth,
  isCurrentMonth,
  today,
}) => {
  const [windowWidth, setWindowWidth] = React.useState(
    typeof window !== 'undefined' ? window.innerWidth : 1200
  );
  const existingDaysSet = React.useMemo(() => new Set(existingDaysInMonth), [existingDaysInMonth]);

  React.useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const { startDay, endDay } = resolveDateStripDayWindow({
    selectedDay,
    daysInMonth,
    windowWidth,
  });

  const dayButtons = Array.from(
    { length: Math.max(0, endDay - startDay + 1) },
    (_, index): React.ReactNode => {
      const day = startDay + index;
      const hasData = existingDaysSet.has(day);
      const isSelected = day === selectedDay;
      const isTodayReal = isCurrentMonth && today.getDate() === day;
      const isFutureBlocked = resolveIsFutureDayBlocked({
        selectedYear,
        selectedMonth,
        day,
        referenceDate: today,
      });

      return (
        <button
          key={day}
          onClick={() => !isFutureBlocked && setSelectedDay(day)}
          disabled={isFutureBlocked}
          className={clsx(
            'flex items-center justify-center w-8 h-8 rounded-lg text-xs font-semibold transition-all shrink-0 relative border',
            isFutureBlocked
              ? 'bg-white/[0.03] text-white/20 border-transparent cursor-not-allowed'
              : isSelected
                ? isTodayReal
                  ? 'bg-gradient-to-br from-cyan-400 to-teal-400 text-slate-900 font-bold border-transparent shadow-lg shadow-cyan-400/25 scale-110'
                  : 'bg-white/20 text-white font-bold border-white/20 shadow-md scale-105'
                : [
                    isTodayReal
                      ? 'bg-cyan-500/10 border-cyan-400/30 text-cyan-300 font-bold hover:bg-cyan-500/20'
                      : 'bg-white/[0.06] border-white/[0.08] text-white/50 hover:bg-white/[0.12] hover:text-white/70',
                  ]
          )}
        >
          <span>{day}</span>
          {hasData && (
            <span
              className={clsx(
                'absolute -bottom-0.5 w-1 h-1 rounded-full',
                isFutureBlocked ? 'bg-white/20' : isSelected ? 'bg-emerald-400' : 'bg-emerald-500'
              )}
            />
          )}
        </button>
      );
    }
  );

  return <>{dayButtons}</>;
};
