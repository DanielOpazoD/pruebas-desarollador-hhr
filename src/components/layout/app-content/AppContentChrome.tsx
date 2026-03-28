import React from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { DateStrip } from '@/components/layout/DateStrip';
import { BookmarkBar } from '@/components/bookmarks/BookmarkBar';
import { AppRouter } from '@/components/AppRouter';
import {
  shouldRenderBookmarkBar,
  shouldRenderDateStrip,
} from '@/components/layout/app-content/appContentVisibilityController';
import type { UseUIStateReturn } from '@/hooks/useUIState';
import type { AppContentRuntime } from '@/components/layout/app-content/useAppContentRuntime';

export interface AppContentChromeProps {
  ui: UseUIStateReturn;
  runtime: AppContentRuntime;
}

export const AppContentChrome: React.FC<AppContentChromeProps> = ({ ui, runtime }) => {
  const { auth, dateNav, censusEmail, fileOps, syncStatus, lastSyncTime, exportManager } = runtime;
  const { isSignatureMode, currentDateString } = dateNav;

  return (
    <>
      {!isSignatureMode && (
        <Navbar
          currentModule={ui.currentModule}
          setModule={ui.setCurrentModule}
          censusViewMode={ui.censusViewMode}
          setCensusViewMode={ui.setCensusViewMode}
          onOpenBedManager={ui.bedManagerModal.open}
          onExportCSV={fileOps.handleExportCSV}
          onImportJSON={fileOps.handleImportJSON}
          onOpenSettings={ui.settingsModal.open}
          userEmail={auth.currentUser?.email}
          onLogout={auth.signOut}
          isFirebaseConnected={auth.isFirebaseConnected}
        />
      )}

      {shouldRenderDateStrip({
        currentModule: ui.currentModule,
        censusViewMode: ui.censusViewMode,
        isSignatureMode,
      }) && (
        <DateStrip
          selectedYear={dateNav.selectedYear}
          setSelectedYear={dateNav.setSelectedYear}
          selectedMonth={dateNav.selectedMonth}
          setSelectedMonth={dateNav.setSelectedMonth}
          selectedDay={dateNav.selectedDay}
          setSelectedDay={dateNav.setSelectedDay}
          currentDateString={currentDateString}
          daysInMonth={dateNav.daysInMonth}
          existingDaysInMonth={dateNav.existingDaysInMonth}
          onExportPDF={ui.showPrintButton ? exportManager.handleExportPDF : undefined}
          onOpenBedManager={ui.currentModule === 'CENSUS' ? ui.bedManagerModal.open : undefined}
          onExportExcel={
            ui.currentModule === 'CENSUS' && runtime.canUseCensusExports
              ? runtime.handleExportExcel
              : undefined
          }
          onConfigureEmail={
            ui.currentModule === 'CENSUS' && runtime.canUseCensusExports
              ? () => censusEmail.setShowEmailConfig(true)
              : undefined
          }
          onSendEmail={
            ui.currentModule === 'CENSUS' && runtime.canUseCensusExports
              ? async () => {
                  await exportManager.handleBackupExcel();
                  await censusEmail.sendEmail();
                }
              : undefined
          }
          onBackupExcel={
            ui.currentModule === 'CENSUS' && runtime.canUseCensusExports
              ? exportManager.handleBackupExcel
              : undefined
          }
          isArchived={exportManager.isArchived}
          isBackingUp={exportManager.isBackingUp}
          currentModule={ui.currentModule}
          emailStatus={censusEmail.status}
          emailErrorMessage={censusEmail.error}
          syncStatus={syncStatus}
          lastSyncTime={lastSyncTime}
          onToggleBookmarks={() => ui.setShowBookmarksBar(!ui.showBookmarksBar)}
          showBookmarks={ui.showBookmarksBar}
          role={auth.role}
          localViewMode={ui.censusLocalViewMode}
          setLocalViewMode={ui.setCensusLocalViewMode}
          onBackupPDF={exportManager.handleBackupHandoff}
          navigateDays={dateNav.navigateDays}
          accessProfile={runtime.censusAccessProfile}
        />
      )}

      {shouldRenderBookmarkBar({
        currentModule: ui.currentModule,
        censusViewMode: ui.censusViewMode,
        isSignatureMode,
        showBookmarksBar: ui.showBookmarksBar,
        role: auth.role,
      }) && <BookmarkBar />}

      <main className="max-w-screen-2xl mx-auto px-4 pt-4 pb-20 flex-1 w-full print:p-0 print:pb-0 print:max-w-none">
        <AppRouter
          ui={ui}
          currentModule={ui.currentModule}
          censusViewMode={ui.censusViewMode}
          selectedDay={dateNav.selectedDay}
          selectedMonth={dateNav.selectedMonth}
          currentDateString={currentDateString}
          role={auth.role}
          isSignatureMode={isSignatureMode}
          showBedManagerModal={ui.bedManagerModal.isOpen}
          onCloseBedManagerModal={ui.bedManagerModal.close}
        />
      </main>
    </>
  );
};
