import React from 'react';
import clsx from 'clsx';

interface HandoffShiftSwitcherProps {
  selectedShift: 'day' | 'night';
  setSelectedShift: (shift: 'day' | 'night') => void;
}

export const HandoffShiftSwitcher: React.FC<HandoffShiftSwitcherProps> = ({
  selectedShift,
  setSelectedShift,
}) => (
  <div className="flex bg-slate-100/80 p-0.5 rounded-xl border border-slate-200/50">
    <button
      onClick={() => setSelectedShift('day')}
      className={clsx(
        'px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer',
        selectedShift === 'day'
          ? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/[0.04]'
          : 'text-slate-500 hover:text-slate-700'
      )}
      aria-pressed={selectedShift === 'day'}
    >
      Turno Largo
    </button>
    <button
      onClick={() => setSelectedShift('night')}
      className={clsx(
        'px-4 py-1.5 rounded-lg text-[13px] font-semibold transition-all duration-200 cursor-pointer',
        selectedShift === 'night'
          ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/[0.04]'
          : 'text-slate-500 hover:text-slate-700'
      )}
      aria-pressed={selectedShift === 'night'}
    >
      Turno Noche
    </button>
  </div>
);
