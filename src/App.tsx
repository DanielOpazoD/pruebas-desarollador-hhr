/**
 * App.tsx - Main Application Component
 *
 * Orchestrates authentication, routing, and global state.
 * Extracted components: AppProviders, AppRouter
 */

import React from 'react';
import {
  useDailyRecord,
  useDateNavigation,
  useFileOperations,
  useExistingDaysQuery,
  useCensusEmail,
  useSignatureMode,
  useAppState,
  useVersionCheck,
} from '@/hooks';
import { UseDateNavigationReturn } from '@/hooks/useDateNavigation';
import { useStorageMigration } from '@/hooks/useStorageMigration';
import { useSystemHealthReporter } from '@/hooks/admin/useSystemHealthReporter';
import { LoginPage } from '@/features/auth';
import { GlobalErrorBoundary } from '@/components/shared/GlobalErrorBoundary';
import { AppContent } from '@/components/layout/AppContent';
import { CensusProvider, CensusContextType } from '@/context/CensusContext';
import { VersionProvider } from '@/context/VersionContext';
import { VersionMismatchOverlay } from '@/components/shared/VersionMismatchOverlay';
import { ViewLoader } from '@/components/ui/ViewLoader';
import { MedicalSignatureView } from '@/views/LazyViews';
import { AuditProvider, useAuth, AuthContextType, AuthProvider, UIProvider } from './context';
import { HospitalProvider } from './context/HospitalContext';
import { RepositoryProvider, defaultRepositories } from '@/services/RepositoryContext';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/config/queryClient';
import { setFirestoreEnabled } from '@/services/repositories/repositoryConfig';
import { resolveShiftNurseSignature } from '@/services/staff/dailyRecordStaffing';
import { logger } from '@/services/utils/loggerService';

// ============================================================================
// Sync Effect - Keeps repository in sync with Firebase connection status
// ============================================================================
const isIgnorableWorkerShutdownImportError = (error: unknown): boolean => {
  const message = String(error);
  return message.includes('[vitest-worker]: Closing rpc while "fetch" was pending');
};

const appLogger = logger.child('App');

const useSyncFirestoreStatus = (isFirebaseConnected: boolean) => {
  React.useEffect(() => {
    try {
      setFirestoreEnabled(isFirebaseConnected);
    } catch (error) {
      if (isIgnorableWorkerShutdownImportError(error)) {
        return;
      }
      appLogger.error('Failed to sync Firestore status', error);
    }
  }, [isFirebaseConnected]);
};

// ============================================================================
// Main App Component
// ============================================================================
function App() {
  // Auth state
  const auth = useAuth();
  // Storage migration only matters once a real session is active.
  useStorageMigration({ enabled: !auth.isLoading && auth.isAuthenticated });

  // Version check (auto-refresh on new deployments)
  useVersionCheck();

  useSyncFirestoreStatus(auth.isFirebaseConnected);

  // Date navigation
  const dateNav = useDateNavigation();

  const { isSignatureMode, currentDateString } = useSignatureMode(
    dateNav.currentDateString,
    auth.currentUser,
    auth.isLoading
  );

  if (isSignatureMode) {
    return (
      <VersionProvider>
        <VersionMismatchOverlay />
        <React.Suspense fallback={<ViewLoader />}>
          <MedicalSignatureView />
        </React.Suspense>
      </VersionProvider>
    );
  }

  // Loading state
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-medical-600 text-xl font-bold">Cargando...</div>
      </div>
    );
  }

  if (!auth.isAuthenticated && !isSignatureMode) {
    return <LoginPage onLoginSuccess={() => {}} />;
  }

  return (
    <VersionProvider>
      <VersionMismatchOverlay />
      <AppInner auth={auth} dateNav={{ ...dateNav, isSignatureMode, currentDateString }} />
    </VersionProvider>
  );
}

/**
 * Inner component to handle hook instantiation AFTER providers are balanced
 */
interface AppInnerProps {
  auth: AuthContextType;
  dateNav: UseDateNavigationReturn & { isSignatureMode: boolean; currentDateString: string };
}

function AppInner({ auth, dateNav }: AppInnerProps) {
  // Report health status in background
  useSystemHealthReporter();

  const dailyRecordHook = useDailyRecord(
    dateNav.currentDateString,
    false,
    auth.isFirebaseConnected
  );
  const { record } = dailyRecordHook;

  const { data: existingDaysInMonth = [] } = useExistingDaysQuery(
    dateNav.selectedYear,
    dateNav.selectedMonth
  );
  const nurseSignature = React.useMemo(() => resolveShiftNurseSignature(record, 'night'), [record]);

  const censusEmail = useCensusEmail({
    record,
    currentDateString: dateNav.currentDateString,
    nurseSignature,
    selectedYear: dateNav.selectedYear,
    selectedMonth: dateNav.selectedMonth,
    selectedDay: dateNav.selectedDay,
    user: auth.currentUser,
    role: auth.role,
  });

  const fileOps = useFileOperations(record, dailyRecordHook.refresh);
  const ui = useAppState();

  // Construct Domain Context Value
  const censusContextValue: CensusContextType = {
    dailyRecord: dailyRecordHook,
    dateNav: {
      ...dateNav,
      existingDaysInMonth: existingDaysInMonth || [],
    },
    fileOps,
    censusEmail,
    nurseSignature,
  };

  return (
    <CensusProvider value={censusContextValue}>
      <AppContent ui={ui} />
    </CensusProvider>
  );
}

// Wrap with Global Error Boundary
const AppWithErrorBoundary = () => {
  return (
    <GlobalErrorBoundary>
      <App />
    </GlobalErrorBoundary>
  );
};

export default function ProvidedApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <RepositoryProvider value={defaultRepositories}>
          <HospitalProvider>
            <UIProvider>
              <AuditProvider userId="anon">
                <AppWithErrorBoundary />
              </AuditProvider>
            </UIProvider>
          </HospitalProvider>
        </RepositoryProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
