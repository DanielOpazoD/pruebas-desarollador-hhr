import React from 'react';
import { FileText, Image, ScrollText } from 'lucide-react';
import type { ClinicalActionConfig } from '@/features/census/components/patient-row/patientActionMenuConfig';
import type { PatientRowAction } from '@/features/census/types/patientRowActionTypes';

interface PatientActionMenuClinicalSectionProps {
  clinicalActions: readonly ClinicalActionConfig[];
  showClinicalDocumentsAction: boolean;
  showExamRequestAction: boolean;
  showImagingRequestAction: boolean;
  onAction: (action: PatientRowAction) => void;
  onViewClinicalDocuments?: () => void;
  onViewExamRequest?: () => void;
  onViewImagingRequest?: () => void;
}

export const PatientActionMenuClinicalSection: React.FC<PatientActionMenuClinicalSectionProps> = ({
  clinicalActions,
  showClinicalDocumentsAction,
  showExamRequestAction,
  showImagingRequestAction,
  onAction,
  onViewClinicalDocuments,
  onViewExamRequest,
  onViewImagingRequest,
}) => (
  <div className="py-1.5">
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.18em] px-3 py-1 block">
      Gestión Clínica
    </span>
    {clinicalActions.map(({ action, icon: Icon, label, iconClassName }) => (
      <button
        key={action}
        onClick={() => onAction(action)}
        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 group"
      >
        <Icon
          size={15}
          className={`${iconClassName} group-hover:translate-x-0.5 transition-transform`}
        />
        <span className="text-[15px]">{label}</span>
      </button>
    ))}
    {showClinicalDocumentsAction && (
      <>
        <div className="h-px bg-slate-100 mx-3 my-1"></div>
        <button
          onClick={onViewClinicalDocuments}
          data-testid="patient-row-open-clinical-documents"
          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 group"
        >
          <ScrollText
            size={15}
            className="text-medical-500 group-hover:text-medical-700 transition-colors"
          />
          <span className="text-[15px]">Documentos Clínicos</span>
        </button>
      </>
    )}
    {showExamRequestAction && (
      <>
        <div className="h-px bg-slate-100 mx-3 my-1"></div>
        <button
          onClick={onViewExamRequest}
          className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 group"
        >
          <FileText
            size={15}
            className="text-slate-400 group-hover:text-medical-600 transition-colors"
          />
          <span className="text-[15px]">Solicitud Exámenes</span>
        </button>
      </>
    )}
    {showImagingRequestAction && (
      <button
        onClick={onViewImagingRequest}
        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 group"
      >
        <Image size={15} className="text-slate-400 group-hover:text-blue-600 transition-colors" />
        <span className="text-[15px]">Solicitud de Imágenes</span>
      </button>
    )}
  </div>
);
