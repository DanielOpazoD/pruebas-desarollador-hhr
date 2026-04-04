import React from 'react';
import clsx from 'clsx';
import type { MedicalTabMode } from '@/features/handoff/controllers/medicalHandoffTabsController';

interface MedicalHandoffTabSwitcherProps {
  activeTab: MedicalTabMode;
  setActiveTab: (tab: MedicalTabMode) => void;
  upcPatientCount: number;
  nonUpcPatientCount: number;
}

export const MedicalHandoffTabSwitcher: React.FC<MedicalHandoffTabSwitcherProps> = ({
  activeTab,
  setActiveTab,
  upcPatientCount,
  nonUpcPatientCount,
}) => (
  <div className="flex bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50">
    <button
      onClick={() => setActiveTab('all')}
      className={clsx(
        'px-3 py-1 rounded-md text-[12px] font-semibold transition-all duration-200',
        activeTab === 'all'
          ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/[0.04]'
          : 'text-slate-500 hover:text-slate-700'
      )}
    >
      Todos ({upcPatientCount + nonUpcPatientCount})
    </button>
    <button
      onClick={() => setActiveTab('upc')}
      className={clsx(
        'px-3 py-1 rounded-md text-[12px] font-semibold transition-all duration-200 flex items-center gap-1.5',
        activeTab === 'upc'
          ? 'bg-red-50 text-red-700 shadow-sm ring-1 ring-red-200/50'
          : 'text-slate-500 hover:text-slate-700'
      )}
    >
      <span className="h-2 w-2 rounded-full bg-red-500" />
      UPC ({upcPatientCount})
    </button>
    <button
      onClick={() => setActiveTab('no-upc')}
      className={clsx(
        'px-3 py-1 rounded-md text-[12px] font-semibold transition-all duration-200 flex items-center gap-1.5',
        activeTab === 'no-upc'
          ? 'bg-green-50 text-green-700 shadow-sm ring-1 ring-green-200/50'
          : 'text-slate-500 hover:text-slate-700'
      )}
    >
      <span className="h-2 w-2 rounded-full bg-green-500" />
      No UPC ({nonUpcPatientCount})
    </button>
  </div>
);
