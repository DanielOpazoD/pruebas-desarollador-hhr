import React from 'react';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import { CMASection } from '@/features/census/components/CMASection';
import { CensusModals } from '@/features/census/components/CensusModals';
import { DischargesSection } from '@/features/census/components/DischargesSection';
import { TransfersSection } from '@/features/census/components/TransfersSection';

interface CensusRegisterSectionsProps {
  readOnly: boolean;
  showBedManagerModal: boolean;
  onCloseBedManagerModal: () => void;
}

export const CensusRegisterSections: React.FC<CensusRegisterSectionsProps> = ({
  readOnly,
  showBedManagerModal,
  onCloseBedManagerModal,
}) => (
  <>
    <SectionErrorBoundary sectionName="Altas del Día" fallbackHeight="100px">
      <DischargesSection />
    </SectionErrorBoundary>

    <SectionErrorBoundary sectionName="Traslados del Día" fallbackHeight="100px">
      <TransfersSection />
    </SectionErrorBoundary>

    <SectionErrorBoundary sectionName="Cirugía Mayor Ambulatoria" fallbackHeight="100px">
      <CMASection />
    </SectionErrorBoundary>

    {!readOnly && (
      <CensusModals
        showBedManagerModal={showBedManagerModal}
        onCloseBedManagerModal={onCloseBedManagerModal}
      />
    )}
  </>
);
