import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import { CensusView } from '@/features/census/components/CensusView';
import { useCensusViewModel } from '@/features/census/hooks/useCensusViewModel';
import { useCensusMigrationBootstrap } from '@/features/census/hooks/useCensusMigrationBootstrap';
import { BedType } from '@/types/domain/beds';
import type { BedDefinition } from '@/types/domain/beds';

vi.mock('@/features/census/hooks/useCensusViewModel', () => ({
  useCensusViewModel: vi.fn(),
}));

vi.mock('@/features/census/hooks/useCensusMigrationBootstrap', () => ({
  useCensusMigrationBootstrap: vi.fn(),
}));

vi.mock('@/components/ui/ViewLoader', () => ({
  ViewLoader: () => <div data-testid="view-loader">View Loader</div>,
}));

vi.mock('@/utils/dateUtils', async () => {
  const actual = await vi.importActual('@/utils/dateUtils');
  return {
    ...actual,
    getTodayISO: () => '2025-01-01',
  };
});

vi.mock('@/components/shared/SectionErrorBoundary', () => ({
  SectionErrorBoundary: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/analytics/public', () => ({
  AnalyticsView: () => <div data-testid="analytics-view">Analytics View</div>,
}));

vi.mock('@/features/census/components/EmptyDayPrompt', () => ({
  EmptyDayPrompt: () => <div data-testid="empty-day-prompt">Empty Day Prompt</div>,
}));

vi.mock('@/features/census/components/CensusRegisterContent', () => ({
  CensusRegisterContent: ({
    readOnly,
    localViewMode,
    visibleBeds,
  }: {
    readOnly: boolean;
    localViewMode: 'TABLE' | '3D';
    visibleBeds: Array<{ id: string }>;
  }) => (
    <div data-testid="census-register-content">
      <div data-testid="census-staff-header">Census Staff Header</div>
      {localViewMode === '3D' ? (
        <div data-testid="hospital-floor-map">{visibleBeds.map(bed => bed.id).join(',')}</div>
      ) : (
        <div data-testid="census-table">Census Table</div>
      )}
      <div data-testid="discharges-section">Discharges Section</div>
      <div data-testid="transfers-section">Transfers Section</div>
      <div data-testid="cma-section">CMA Section</div>
      {!readOnly && <div data-testid="census-modals">Census Modals</div>}
    </div>
  ),
}));

describe('CensusView', () => {
  const defaultProps = {
    viewMode: 'REGISTER' as const,
    selectedDay: 1,
    selectedMonth: 0,
    currentDateString: '2025-01-01',
    showBedManagerModal: false,
    onCloseBedManagerModal: vi.fn(),
  };

  type CensusViewModel = ReturnType<typeof useCensusViewModel>;
  const baseViewModel = {
    beds: null,
    previousRecordAvailable: false,
    previousRecordDate: undefined,
    availableDates: [],
    createDay: vi.fn(),
    stats: null,
    marginStyle: {},
    visibleBeds: [],
  } as unknown as CensusViewModel;

  const buildViewModel = (overrides: Partial<CensusViewModel> = {}): CensusViewModel => ({
    ...baseViewModel,
    ...overrides,
  });
  const buildVisibleBed = (id: string): BedDefinition => ({
    id,
    name: id,
    type: BedType.MEDIA,
    isCuna: false,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(useCensusViewModel).mockReturnValue(buildViewModel());
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders AnalyticsView when viewMode is ANALYTICS', () => {
    render(<CensusView {...defaultProps} viewMode="ANALYTICS" />);
    expect(screen.getByTestId('analytics-view')).toBeInTheDocument();
    expect(vi.mocked(useCensusMigrationBootstrap)).toHaveBeenCalledWith(false);
  });

  it('renders EmptyDayPrompt when record is missing', async () => {
    vi.useFakeTimers();
    vi.mocked(useCensusViewModel).mockReturnValue(
      buildViewModel({ beds: null, availableDates: ['2024-12-31'] })
    );

    render(<CensusView {...defaultProps} />);

    expect(screen.getByTestId('view-loader')).toBeInTheDocument();
    expect(screen.queryByTestId('empty-day-prompt')).not.toBeInTheDocument();
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1300);
    });
    vi.useRealTimers();
    expect(await screen.findByTestId('empty-day-prompt')).toBeInTheDocument();
    expect(vi.mocked(useCensusMigrationBootstrap)).toHaveBeenCalledWith(true);
  });

  it('shows the empty prompt immediately for dates that are not today', async () => {
    vi.mocked(useCensusViewModel).mockReturnValue(buildViewModel({ beds: null }));

    render(<CensusView {...defaultProps} currentDateString="2025-01-02" />);

    expect(await screen.findByTestId('empty-day-prompt')).toBeInTheDocument();
    expect(screen.queryByTestId('view-loader')).not.toBeInTheDocument();
  });

  it('renders main census sections when record is present', async () => {
    vi.mocked(useCensusViewModel).mockReturnValue(
      buildViewModel({
        beds: {},
        visibleBeds: [buildVisibleBed('H1C1')],
      })
    );

    render(<CensusView {...defaultProps} />);

    expect(await screen.findByTestId('census-staff-header')).toBeInTheDocument();
    expect(await screen.findByTestId('census-table')).toBeInTheDocument();
    expect(await screen.findByTestId('discharges-section')).toBeInTheDocument();
    expect(await screen.findByTestId('transfers-section')).toBeInTheDocument();
    expect(await screen.findByTestId('cma-section')).toBeInTheDocument();
  });

  it('renders CensusModals when not in readOnly mode', async () => {
    vi.mocked(useCensusViewModel).mockReturnValue(
      buildViewModel({
        beds: {},
      })
    );

    render(<CensusView {...defaultProps} readOnly={false} />);

    expect(await screen.findByTestId('census-modals')).toBeInTheDocument();
  });

  it('hides CensusModals in readOnly mode', () => {
    vi.mocked(useCensusViewModel).mockReturnValue(
      buildViewModel({
        beds: {},
      })
    );

    render(<CensusView {...defaultProps} readOnly={true} />);

    expect(screen.queryByTestId('census-modals')).not.toBeInTheDocument();
  });

  it('renders 3D map when localViewMode is 3D', async () => {
    vi.mocked(useCensusViewModel).mockReturnValue(
      buildViewModel({
        beds: {},
        visibleBeds: [buildVisibleBed('E1')],
      })
    );

    render(<CensusView {...defaultProps} localViewMode="3D" />);

    const floorMap = await screen.findByTestId('hospital-floor-map');
    expect(floorMap).toBeInTheDocument();
    expect(floorMap.textContent).toContain('E1');
  });
});
