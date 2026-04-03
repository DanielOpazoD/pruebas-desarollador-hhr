import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface DateStripYearNavigatorProps {
  selectedYear: number;
  setSelectedYear: React.Dispatch<React.SetStateAction<number>>;
}

export const DateStripYearNavigator: React.FC<DateStripYearNavigatorProps> = ({
  selectedYear,
  setSelectedYear,
}) => (
  <div className="flex items-center shrink-0 rounded-lg bg-slate-50 border border-slate-200/80 px-0.5 py-0.5">
    <button
      onClick={() => setSelectedYear(year => year - 1)}
      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
    >
      <ChevronLeft size={13} />
    </button>
    <span className="mx-1.5 text-[13px] font-bold text-slate-700 tabular-nums">{selectedYear}</span>
    <button
      onClick={() => setSelectedYear(year => year + 1)}
      className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
    >
      <ChevronRight size={13} />
    </button>
  </div>
);
