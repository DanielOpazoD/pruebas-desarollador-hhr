import React from 'react';
import { History } from 'lucide-react';

interface PatientActionMenuHistoryActionProps {
  onViewHistory: () => void;
}

export const PatientActionMenuHistoryAction: React.FC<PatientActionMenuHistoryActionProps> = ({
  onViewHistory,
}) => (
  <button
    onClick={onViewHistory}
    className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-600 border-b border-slate-100"
  >
    <History size={14} className="text-violet-400" />
    <span className="font-medium text-[13px]">Ver Historial</span>
  </button>
);
