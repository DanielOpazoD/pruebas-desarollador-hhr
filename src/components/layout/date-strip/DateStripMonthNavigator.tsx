import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { MONTH_NAMES } from '@/constants/export';

interface DateStripMonthNavigatorProps {
  selectedMonth: number;
  onChangeMonth: (delta: number) => void;
}

export const DateStripMonthNavigator: React.FC<DateStripMonthNavigatorProps> = ({
  selectedMonth,
  onChangeMonth,
}) => (
  <div className="flex items-center shrink-0 rounded-lg bg-slate-50 border border-slate-200/80 px-0.5 py-0.5">
    <button
      onClick={() => onChangeMonth(-1)}
      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
    >
      <ChevronLeft size={13} />
    </button>
    <span className="mx-1 uppercase text-[11px] font-semibold tracking-wider text-slate-500 min-w-[70px] text-center">
      {MONTH_NAMES[selectedMonth]}
    </span>
    <button
      onClick={() => onChangeMonth(1)}
      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
    >
      <ChevronRight size={13} />
    </button>
  </div>
);
