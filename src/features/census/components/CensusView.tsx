import React, { Suspense, lazy } from 'react';
import { ViewLoader } from '@/components/ui/ViewLoader';
import { SectionErrorBoundary } from '@/components/shared/SectionErrorBoundary';
import { AnalyticsView } from '@/features/analytics/public';
import { useCensusMigrationBootstrap } from '@/features/census/hooks/useCensusMigrationBootstrap';
import { useCensusViewModel } from '@/features/census/hooks/useCensusViewModel';

const LazyCensusRegisterContent = lazy(() =>
  import('./CensusRegisterContent').then(module => ({
    default: module.CensusRegisterContent,
  }))
);

const LazyEmptyDayPrompt = lazy(() =>
  import('./EmptyDayPrompt').then(module => ({
    default: module.EmptyDayPrompt,
  }))
);

type ViewMode = 'REGISTER' | 'ANALYTICS';

interface CensusViewProps {
  viewMode: ViewMode;
  selectedDay: number;
  selectedMonth: number;
  currentDateString: string;
  showBedManagerModal: boolean;
  onCloseBedManagerModal: () => void;
  readOnly?: boolean;
  localViewMode?: 'TABLE' | '3D';
}

const CensusViewContent: React.FC<CensusViewProps> = ({
  viewMode,
  selectedDay,
  selectedMonth,
  currentDateString,
  showBedManagerModal,
  onCloseBedManagerModal,
  readOnly = false,
  localViewMode = 'TABLE',
}) => {
  const {
    beds,
    previousRecordAvailable,
    previousRecordDate,
    availableDates,
    createDay,
    stats,
    marginStyle,
    visibleBeds,
  } = useCensusViewModel(currentDateString);

  useCensusMigrationBootstrap();

  if (viewMode === 'ANALYTICS') {
    return (
      <SectionErrorBoundary sectionName="Estadísticas">
        <AnalyticsView />
      </SectionErrorBoundary>
    );
  }

  if (!beds) {
    return (
      <Suspense fallback={<ViewLoader />}>
        <LazyEmptyDayPrompt
          selectedDay={selectedDay}
          selectedMonth={selectedMonth}
          currentDateString={currentDateString}
          previousRecordAvailable={previousRecordAvailable}
          previousRecordDate={previousRecordDate}
          availableDates={availableDates}
          onCreateDay={createDay}
          readOnly={readOnly}
        />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<ViewLoader />}>
      <LazyCensusRegisterContent
        currentDateString={currentDateString}
        readOnly={readOnly}
        localViewMode={localViewMode}
        beds={beds}
        visibleBeds={visibleBeds}
        marginStyle={marginStyle}
        stats={stats}
        showBedManagerModal={showBedManagerModal}
        onCloseBedManagerModal={onCloseBedManagerModal}
      />
    </Suspense>
  );
};

// Exported component
export const CensusView: React.FC<CensusViewProps> = CensusViewContent;
