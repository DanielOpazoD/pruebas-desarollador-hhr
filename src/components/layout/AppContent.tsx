import React from 'react';
import { AppProviders } from '@/components/AppProviders';
import { UseUIStateReturn } from '@/hooks/useUIState';
import { ReminderCenterProvider } from '@/context/ReminderCenterContext';
import { AppContentChrome } from '@/components/layout/app-content/AppContentChrome';
import { AppContentOverlays } from '@/components/layout/app-content/AppContentOverlays';
import { useAppContentRuntime } from '@/components/layout/app-content/useAppContentRuntime';
import { useAppContentShellEffects } from '@/components/layout/app-content/useAppContentShellEffects';

interface AppContentProps {
  ui: UseUIStateReturn;
}

export const AppContent: React.FC<AppContentProps> = ({ ui }) => {
  const runtime = useAppContentRuntime({ ui });
  const { auth, dailyRecordHook, dateNav } = runtime;

  useAppContentShellEffects({
    role: auth.role,
    currentModule: ui.currentModule,
    setCurrentModule: ui.setCurrentModule,
    censusLocalViewMode: ui.censusLocalViewMode,
    setCensusLocalViewMode: ui.setCensusLocalViewMode,
    isSignatureMode: dateNav.isSignatureMode,
    setSelectedShift: ui.setSelectedShift,
  });

  return (
    <AppProviders dailyRecordHook={dailyRecordHook}>
      <ReminderCenterProvider>
        <div className="min-h-screen bg-slate-100 font-sans flex flex-col print:bg-white print:p-0">
          <AppContentChrome ui={ui} runtime={runtime} />
          <AppContentOverlays ui={ui} runtime={runtime} />
        </div>
      </ReminderCenterProvider>
    </AppProviders>
  );
};
