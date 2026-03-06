import React from 'react';
import type { UtilityActionConfig } from '@/features/census/components/patient-row/patientActionMenuConfig';
import type { PatientRowAction } from '@/features/census/types/patientRowActionTypes';

interface PatientActionMenuUtilityGridProps {
  utilityActions: UtilityActionConfig[];
  onAction: (action: PatientRowAction) => void;
}

export const PatientActionMenuUtilityGrid: React.FC<PatientActionMenuUtilityGridProps> = ({
  utilityActions,
  onAction,
}) => (
  <div className="grid grid-cols-3 gap-1.5 px-3 py-2 border-b border-slate-100 bg-white">
    {utilityActions.map(({ action, icon: Icon, label, title, iconClassName }) => (
      <button
        key={action}
        onClick={() => onAction(action)}
        className={`flex min-w-0 items-center justify-center gap-1 rounded-full border border-slate-200 bg-slate-50/70 px-1.5 py-1 text-slate-500 transition-colors hover:bg-slate-100 hover:border-slate-300 group ${iconClassName}`}
        title={title}
      >
        <Icon size={13} className="group-hover:scale-105 transition-transform" />
        <span className="truncate text-[11px] font-medium leading-none">{label}</span>
      </button>
    ))}
  </div>
);
