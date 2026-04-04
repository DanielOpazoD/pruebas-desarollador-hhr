import React from 'react';
import { MessageSquare, Stethoscope } from 'lucide-react';
import type { MedicalHandoffScope } from '@/types/medicalHandoff';
import { HandoffShiftSwitcher } from './HandoffShiftSwitcher';
import { MedicalShareActions } from './MedicalShareActions';

interface HandoffHeaderProps {
  isMedical: boolean;
  selectedShift: 'day' | 'night';
  setSelectedShift: (shift: 'day' | 'night') => void;
  readOnly: boolean;
  showMedicalShareActions?: boolean;
  medicalSignature?: {
    doctorName: string;
    signedAt: string;
  } | null;
  medicalHandoffSentAt?: string | null;
  onSendWhatsApp: () => void;
  onShareLink: (scope: MedicalHandoffScope) => void;
  extraAction?: React.ReactNode;
}

export const HandoffHeader: React.FC<HandoffHeaderProps> = ({
  isMedical,
  selectedShift,
  setSelectedShift,
  readOnly,
  showMedicalShareActions = true,
  medicalSignature,
  onSendWhatsApp,
  onShareLink,
  extraAction,
}) => {
  const title = isMedical ? 'Entrega de Turno' : 'Entrega de Turno Enfermería';
  const Icon = isMedical ? Stethoscope : MessageSquare;

  return (
    <header className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200/80 ring-1 ring-black/[0.02] flex flex-col md:flex-row items-center gap-3 print:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-sky-700 text-white shadow-md shadow-sky-500/20">
          <Icon size={20} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h2>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {!isMedical && (
          <HandoffShiftSwitcher selectedShift={selectedShift} setSelectedShift={setSelectedShift} />
        )}
      </div>

      {extraAction && (
        <div className="flex items-center gap-2">
          {extraAction}
          <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block" />
        </div>
      )}

      {isMedical && !readOnly && showMedicalShareActions && (
        <MedicalShareActions
          medicalSignature={medicalSignature}
          onSendWhatsApp={onSendWhatsApp}
          onShareLink={onShareLink}
        />
      )}
    </header>
  );
};
