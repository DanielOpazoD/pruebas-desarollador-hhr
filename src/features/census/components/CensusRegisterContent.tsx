import React, { Suspense, lazy, type CSSProperties } from 'react';
import type { BedDefinition, DailyRecord, Statistics } from '@/types';
import { CensusActionsProvider } from './CensusActionsContext';
import { CensusPrintHeader } from './CensusPrintHeader';
import { CensusStaffHeader } from './CensusStaffHeader';
import { CensusRegisterMainContent } from './CensusRegisterMainContent';

const LazyCensusRegisterSections = lazy(() =>
  import('./CensusRegisterSections').then(module => ({
    default: module.CensusRegisterSections,
  }))
);

interface CensusRegisterContentProps {
  currentDateString: string;
  readOnly: boolean;
  localViewMode: 'TABLE' | '3D';
  beds: DailyRecord['beds'];
  visibleBeds: BedDefinition[];
  marginStyle: CSSProperties;
  stats: Statistics | null;
  showBedManagerModal: boolean;
  onCloseBedManagerModal: () => void;
}

export const CensusRegisterContent: React.FC<CensusRegisterContentProps> = ({
  currentDateString,
  readOnly,
  localViewMode,
  beds,
  visibleBeds,
  marginStyle,
  stats,
  showBedManagerModal,
  onCloseBedManagerModal,
}) => (
  <CensusActionsProvider>
    <CensusPrintHeader currentDateString={currentDateString} />

    <div className="space-y-6" style={marginStyle}>
      <CensusStaffHeader readOnly={readOnly} stats={stats} />

      <CensusRegisterMainContent
        localViewMode={localViewMode}
        currentDateString={currentDateString}
        readOnly={readOnly}
        visibleBeds={visibleBeds}
        beds={beds}
      />

      <Suspense fallback={null}>
        <LazyCensusRegisterSections
          readOnly={readOnly}
          showBedManagerModal={showBedManagerModal}
          onCloseBedManagerModal={onCloseBedManagerModal}
        />
      </Suspense>
    </div>
  </CensusActionsProvider>
);
