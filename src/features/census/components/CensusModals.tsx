import React from 'react';
import { NurseManagerModal } from '@/components/modals/NurseManagerModal';
import { TensManagerModal } from '@/components/modals/TensManagerModal';
import { BedManagerModal } from '@/components/modals/BedManagerModal';
import { CensusActionModals } from './CensusActionModals';
import { useCensusModalsModel } from '@/features/census/hooks/useCensusModalsModel';

interface CensusModalsProps {
  showBedManagerModal: boolean;
  onCloseBedManagerModal: () => void;
}

export const CensusModals: React.FC<CensusModalsProps> = ({
  showBedManagerModal,
  onCloseBedManagerModal,
}) => {
  const {
    staffContext: {
      nursesList,
      tensList,
      showNurseManager,
      setShowNurseManager,
      showTensManager,
      setShowTensManager,
    },
    actionModalProps,
  } = useCensusModalsModel();

  return (
    <>
      <NurseManagerModal
        isOpen={showNurseManager}
        onClose={() => setShowNurseManager(false)}
        nursesList={nursesList}
      />

      <TensManagerModal
        isOpen={showTensManager}
        onClose={() => setShowTensManager(false)}
        tensList={tensList}
      />

      <BedManagerModal isOpen={showBedManagerModal} onClose={onCloseBedManagerModal} />
      <CensusActionModals actionModalProps={actionModalProps} />
    </>
  );
};
