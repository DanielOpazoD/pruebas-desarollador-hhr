import React from 'react';
import clsx from 'clsx';
import { CensusMovementPrimaryCells } from '@/features/census/components/CensusMovementPrimaryCells';
import { CensusMovementDateActionsCells } from '@/features/census/components/CensusMovementDateActionsCells';
import type { DischargeRowViewModel } from '@/features/census/types/censusMovementRowViewModelTypes';
import type { DischargeData } from '@/types';
import { downloadIEEHForm } from '@/services/pdf/ieehPdfService';
import { FileText } from 'lucide-react';

interface DischargeRowViewProps {
  viewModel: DischargeRowViewModel;
  recordDate: string;
  dischargeItem?: DischargeData;
}

export const DischargeRowView: React.FC<DischargeRowViewProps> = ({
  viewModel,
  recordDate,
  dischargeItem,
}) => {
  const handleGenerateIEEH = async () => {
    if (!dischargeItem?.originalData) {
      alert('No hay datos suficientes del paciente para generar el formulario IEEH.');
      return;
    }
    try {
      await downloadIEEHForm(dischargeItem.originalData, {
        dischargeDate: dischargeItem.movementDate || recordDate,
        dischargeTime: dischargeItem.time,
      });
    } catch (err) {
      console.error('[IEEH] Error generando formulario:', err);
      alert('Error al generar el formulario IEEH. Revise la consola para más detalles.');
    }
  };

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50 print:border-slate-300">
      <CensusMovementPrimaryCells viewModel={viewModel} />
      <td className="p-2 text-xs text-slate-500">{viewModel.dischargeTypeLabel}</td>
      <td className="p-2">
        <span
          className={clsx(
            'rounded-full px-2 py-1 text-[11px] font-bold print:border print:border-slate-400',
            viewModel.statusBadgeClassName
          )}
        >
          {viewModel.statusLabel}
        </span>
      </td>
      <CensusMovementDateActionsCells
        recordDate={recordDate}
        movementDate={viewModel.movementDate}
        movementTime={viewModel.movementTime}
        actions={viewModel.actions}
      />
      {/* IEEH PDF Button - only visible if patient snapshot exists */}
      {dischargeItem?.originalData && (
        <td className="p-1 text-center print:hidden">
          <button
            type="button"
            onClick={handleGenerateIEEH}
            title="Generar Informe Estadístico de Egreso (IEEH)"
            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
          >
            <FileText size={12} />
            IEEH
          </button>
        </td>
      )}
    </tr>
  );
};
