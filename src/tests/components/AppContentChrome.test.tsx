import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppContentChrome } from '@/components/layout/app-content/AppContentChrome';

const mockDateStrip = vi.fn();
const mockNavbar = vi.fn();

vi.mock('@/components/layout/Navbar', () => ({
  Navbar: (props: unknown) => {
    mockNavbar(props);
    return <div data-testid="navbar">Navbar</div>;
  },
}));

vi.mock('@/components/layout/DateStrip', () => ({
  DateStrip: (props: unknown) => {
    mockDateStrip(props);
    return <div data-testid="datestrip">DateStrip</div>;
  },
}));

vi.mock('@/components/bookmarks/BookmarkBar', () => ({
  BookmarkBar: () => <div data-testid="bookmark-bar">BookmarkBar</div>,
}));

vi.mock('@/components/AppRouter', () => ({
  AppRouter: () => <div data-testid="app-router">AppRouter</div>,
}));

describe('AppContentChrome', () => {
  const ui = {
    currentModule: 'CENSUS',
    setCurrentModule: vi.fn(),
    censusViewMode: 'REGISTER',
    setCensusViewMode: vi.fn(),
    bedManagerModal: { isOpen: false, open: vi.fn(), close: vi.fn() },
    settingsModal: { isOpen: false, open: vi.fn(), close: vi.fn() },
    showPrintButton: true,
    showBookmarksBar: true,
    setShowBookmarksBar: vi.fn(),
    isTestAgentRunning: false,
    setIsTestAgentRunning: vi.fn(),
    selectedShift: 'day',
    setSelectedShift: vi.fn(),
    censusLocalViewMode: 'TABLE',
    setCensusLocalViewMode: vi.fn(),
  } as const;

  const runtime = {
    auth: {
      currentUser: { email: 'admin@hospital.cl' },
      role: 'admin',
      signOut: vi.fn(),
      isFirebaseConnected: true,
    },
    dateNav: {
      isSignatureMode: false,
      currentDateString: '2026-03-27',
      selectedYear: 2026,
      setSelectedYear: vi.fn(),
      selectedMonth: 2,
      setSelectedMonth: vi.fn(),
      selectedDay: 27,
      setSelectedDay: vi.fn(),
      daysInMonth: 31,
      existingDaysInMonth: [1, 4],
      navigateDays: vi.fn(),
    },
    censusEmail: {
      setShowEmailConfig: vi.fn(),
      sendEmail: vi.fn(),
      status: 'idle',
      error: null,
    },
    fileOps: { handleExportCSV: vi.fn(), handleImportJSON: vi.fn() },
    syncStatus: 'idle',
    lastSyncTime: null,
    exportManager: {
      handleExportPDF: vi.fn(),
      handleBackupExcel: vi.fn(),
      handleBackupHandoff: vi.fn(),
      isArchived: false,
      isBackingUp: false,
    },
    canUseCensusExports: true,
    handleExportExcel: vi.fn(),
    censusAccessProfile: 'full',
  } as const;

  it('renders chrome in normal mode', () => {
    render(<AppContentChrome ui={ui as never} runtime={runtime as never} />);

    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('datestrip')).toBeInTheDocument();
    expect(screen.getByTestId('bookmark-bar')).toBeInTheDocument();
    expect(screen.getByTestId('app-router')).toBeInTheDocument();
  });

  it('hides navigation chrome in signature mode', () => {
    render(
      <AppContentChrome
        ui={ui as never}
        runtime={
          {
            ...runtime,
            dateNav: { ...runtime.dateNav, isSignatureMode: true },
          } as never
        }
      />
    );

    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('datestrip')).not.toBeInTheDocument();
    expect(screen.queryByTestId('bookmark-bar')).not.toBeInTheDocument();
  });

  it('keeps census export actions only on allowed census views', () => {
    const { rerender } = render(<AppContentChrome ui={ui as never} runtime={runtime as never} />);

    expect(mockDateStrip).toHaveBeenLastCalledWith(
      expect.objectContaining({
        onOpenBedManager: expect.any(Function),
        onExportExcel: expect.any(Function),
        onConfigureEmail: expect.any(Function),
      })
    );

    rerender(
      <AppContentChrome
        ui={
          {
            ...ui,
            currentModule: 'CUDYR',
          } as never
        }
        runtime={runtime as never}
      />
    );

    expect(mockDateStrip).toHaveBeenLastCalledWith(
      expect.objectContaining({
        onOpenBedManager: undefined,
        onExportExcel: undefined,
        onConfigureEmail: undefined,
      })
    );
  });
});
