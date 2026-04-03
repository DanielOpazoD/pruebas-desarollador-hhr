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
  <div className="flex items-center text-white/80 font-bold shrink-0">
    <button
      onClick={() => setSelectedYear(year => year - 1)}
      className="p-1 hover:bg-white/[0.08] text-white/40 hover:text-white/70 rounded-lg"
    >
      <ChevronLeft size={14} />
    </button>
    <span className="mx-1 text-sm font-bold">{selectedYear}</span>
    <button
      onClick={() => setSelectedYear(year => year + 1)}
      className="p-1 hover:bg-white/[0.08] text-white/40 hover:text-white/70 rounded-lg"
    >
      <ChevronRight size={14} />
    </button>
  </div>
);
