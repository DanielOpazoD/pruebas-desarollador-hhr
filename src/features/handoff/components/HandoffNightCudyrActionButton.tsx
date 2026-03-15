import React from 'react';
import { Activity } from 'lucide-react';

interface HandoffNightCudyrActionButtonProps {
  onClick: () => void;
}

export const HandoffNightCudyrActionButton: React.FC<HandoffNightCudyrActionButtonProps> = ({
  onClick,
}) => (
  <button
    onClick={onClick}
    className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2"
  >
    <Activity size={14} />
    CUDYR
  </button>
);
