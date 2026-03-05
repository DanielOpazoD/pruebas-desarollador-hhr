import React from 'react';
import { FileText } from 'lucide-react';

import { BaseModal } from '@/components/shared/BaseModal';
import type { PatientData } from '@/types';
import { buildClinicalDocumentEpisodeContext } from '@/features/clinical-documents/controllers/clinicalDocumentEpisodeController';
import { ClinicalDocumentsWorkspace } from '@/features/clinical-documents/components/ClinicalDocumentsWorkspace';

interface ClinicalDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientData;
  currentDateString: string;
  bedId: string;
}

const formatDateLabel = (value?: string): string => {
  if (!value) return 'Sin fecha';
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  const day = String(parsed.getDate()).padStart(2, '0');
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const year = parsed.getFullYear();
  return `${day}-${month}-${year}`;
};

export const ClinicalDocumentsModal: React.FC<ClinicalDocumentsModalProps> = ({
  isOpen,
  onClose,
  patient,
  currentDateString,
  bedId,
}) => {
  const episode = buildClinicalDocumentEpisodeContext(patient, currentDateString, bedId);
  const episodeDate = formatDateLabel(episode.admissionDate || currentDateString);

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div>
          <h2 className="text-base font-bold text-slate-800 leading-tight">Documentos Clínicos</h2>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
            {patient.patientName || 'Paciente'} · {patient.rut || 'Sin RUT'} · {episodeDate}
          </p>
        </div>
      }
      icon={<FileText size={18} className="text-medical-600" />}
      size="full"
      className="max-w-[96vw] xl:max-w-[1500px]"
      variant="white"
      bodyClassName="p-0"
      scrollableBody={false}
    >
      <ClinicalDocumentsWorkspace
        patient={patient}
        currentDateString={currentDateString}
        bedId={bedId}
        isActive={isOpen}
      />
    </BaseModal>
  );
};

export default ClinicalDocumentsModal;
