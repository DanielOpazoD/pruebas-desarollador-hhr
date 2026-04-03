import React from 'react';
import { FilePlus2 } from 'lucide-react';
import { MedicalIndicationsDialog } from '@/components/layout/date-strip/MedicalIndicationsDialog';
import type { MedicalIndicationsPatientOption } from '@/shared/contracts/medicalIndications';

interface MedicalIndicationsQuickActionProps {
  patients: MedicalIndicationsPatientOption[];
}

export type { MedicalIndicationsPatientOption } from '@/shared/contracts/medicalIndications';

export const MedicalIndicationsQuickAction: React.FC<MedicalIndicationsQuickActionProps> = ({
  patients,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  if (patients.length === 0) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 px-2.5 py-1.5 bg-medical-50 hover:bg-medical-100 text-medical-700 rounded-md border border-medical-200 transition-colors text-[11px] font-semibold"
        title="Indicaciones médicas"
      >
        <FilePlus2 size={14} />
        <span className="hidden sm:inline">Indicaciones</span>
      </button>

      <MedicalIndicationsDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        patients={patients}
      />
    </>
  );
};
