import React from 'react';
import { Box, LayoutGrid, Lock, Radio } from 'lucide-react';
import clsx from 'clsx';
import type { MedicalIndicationsPatientOption } from '@/shared/contracts/medicalIndications';
import { RadiologyViewerModal } from '@/components/modals/RadiologyViewerModal';

interface DateStripQuickActionsProps {
  onOpenBedManager?: () => void;
  localViewMode: 'TABLE' | '3D';
  setLocalViewMode: (v: 'TABLE' | '3D') => void;
  hide3DToggle?: boolean;
  medicalIndicationsPatients?: MedicalIndicationsPatientOption[];
}

export const DateStripQuickActions: React.FC<DateStripQuickActionsProps> = ({
  onOpenBedManager,
  localViewMode,
  setLocalViewMode,
  hide3DToggle = false,
  medicalIndicationsPatients = [],
}) => {
  const [isRadiologyOpen, setIsRadiologyOpen] = React.useState(false);

  const radiologyPatients = React.useMemo(
    () =>
      medicalIndicationsPatients
        .filter(p => p.rut && p.patientName)
        .map(p => ({
          bedId: p.bedId,
          label: p.label,
          patientName: p.patientName,
          rut: p.rut,
          diagnosis: p.diagnosis,
        })),
    [medicalIndicationsPatients]
  );

  return (
    <div className="flex items-center gap-1">
      {onOpenBedManager && (
        <button
          onClick={onOpenBedManager}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors text-[11px] font-semibold"
          title="Bloqueo de camas"
        >
          <Lock size={14} />
          <span className="hidden sm:inline">Camas</span>
        </button>
      )}

      {radiologyPatients.length > 0 && (
        <>
          <button
            onClick={() => setIsRadiologyOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-lg border border-violet-200 transition-colors text-[11px] font-semibold"
            title="Radiología / Imagenología"
          >
            <Radio size={14} />
            <span className="hidden sm:inline">MMRAD</span>
          </button>
          <RadiologyViewerModal
            isOpen={isRadiologyOpen}
            onClose={() => setIsRadiologyOpen(false)}
            patients={radiologyPatients}
          />
        </>
      )}

      {!hide3DToggle && (
        <button
          onClick={() => setLocalViewMode(localViewMode === 'TABLE' ? '3D' : 'TABLE')}
          className={clsx(
            'flex items-center justify-center p-1.5 rounded-md border transition-all',
            localViewMode === '3D'
              ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm'
              : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
          )}
          title={localViewMode === '3D' ? 'Volver a Tabla' : 'Ver Mapa 3D'}
        >
          {localViewMode === '3D' ? <LayoutGrid size={15} /> : <Box size={15} />}
        </button>
      )}
    </div>
  );
};
