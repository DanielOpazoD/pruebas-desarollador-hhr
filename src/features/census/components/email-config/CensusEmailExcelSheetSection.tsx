import React from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { ModalSection } from '@/components/shared/BaseModal';

export const CensusEmailExcelSheetSection: React.FC = () => {
  return (
    <ModalSection
      title="Configuración de Excel"
      icon={<FileSpreadsheet size={16} className="text-emerald-600" />}
      variant="success"
      className="p-3"
    >
      <div className="space-y-2">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <p className="text-[11px] font-semibold text-emerald-900 leading-snug">
            El Excel adjunta siempre el día actual con la hora real del envío.
          </p>
          <p className="mt-1 text-[10px] text-emerald-800 leading-snug">
            La variante con corte a las 23:59 fue eliminada y ya no se envían duplicados del mismo
            día.
          </p>
        </div>
      </div>
    </ModalSection>
  );
};
