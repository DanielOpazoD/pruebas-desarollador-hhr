import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Stethoscope, Share2, Send, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import type { MedicalHandoffScope } from '@/features/handoff/controllers';

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
  const headerColor = isMedical ? 'text-sky-600' : 'text-medical-600';
  const [showShareMenu, setShowShareMenu] = useState(false);
  const shareMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showShareMenu) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (shareMenuRef.current && !shareMenuRef.current.contains(event.target as Node)) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showShareMenu]);

  return (
    <header className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-3 print:hidden">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-50 rounded-lg">
          <Icon size={24} className={headerColor} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {/* Shift Switcher - Only Nursing */}
        {!isMedical && (
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setSelectedShift('day')}
              className={clsx(
                'p-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer',
                selectedShift === 'day'
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
              aria-pressed={selectedShift === 'day'}
            >
              Turno Largo
            </button>
            <button
              onClick={() => setSelectedShift('night')}
              className={clsx(
                'p-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer',
                selectedShift === 'night'
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
              aria-pressed={selectedShift === 'night'}
            >
              Turno Noche
            </button>
          </div>
        )}
      </div>

      {extraAction && (
        <div className="flex items-center gap-2">
          {extraAction}
          <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block" />
        </div>
      )}

      {/* Medical Action Buttons */}
      {isMedical && !readOnly && showMedicalShareActions && (
        <div className="flex items-center gap-2 md:ml-auto">
          <button
            onClick={onSendWhatsApp}
            disabled={!!medicalSignature}
            className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer',
              medicalSignature
                ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                : 'bg-green-500 text-white hover:bg-green-600'
            )}
            title="Enviar entrega por WhatsApp (Manual)"
            aria-label="Enviar entrega por WhatsApp (Manual)"
          >
            <Send size={14} aria-hidden="true" /> Enviar por WhatsApp
          </button>
          <div className="relative" ref={shareMenuRef}>
            <button
              onClick={() => setShowShareMenu(previous => !previous)}
              className="flex items-center gap-2 px-3 py-1.5 bg-sky-100 text-sky-700 rounded-lg hover:bg-sky-200 transition-colors text-xs font-bold cursor-pointer"
              title="Generar link para firma del médico"
              aria-label="Generar link para firma del médico"
            >
              <Share2 size={14} aria-hidden="true" />
              Links firma
              <ChevronDown
                size={14}
                className={clsx('transition-transform', showShareMenu && 'rotate-180')}
              />
            </button>

            {showShareMenu && (
              <div className="absolute right-0 top-full mt-1 min-w-[220px] rounded-lg border border-slate-200 bg-white py-1 shadow-lg z-50">
                <button
                  onClick={() => {
                    onShareLink('all');
                    setShowShareMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                >
                  Copiar link: todos
                </button>
                <button
                  onClick={() => {
                    onShareLink('upc');
                    setShowShareMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-red-700 hover:bg-red-50"
                >
                  Copiar link: UPC
                </button>
                <button
                  onClick={() => {
                    onShareLink('no-upc');
                    setShowShareMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-emerald-700 hover:bg-emerald-50"
                >
                  Copiar link: No UPC
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
