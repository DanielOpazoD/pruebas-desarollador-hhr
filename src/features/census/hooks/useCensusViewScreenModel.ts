import { useEffect, useState } from 'react';
import { useAuth } from '@/context';
import { getTodayISO } from '@/utils/dateUtils';
import { useCensusMigrationBootstrap } from './useCensusMigrationBootstrap';
import { useCensusViewRouteModel } from './useCensusViewRouteModel';
import type { CensusAccessProfile } from '../types/censusAccessProfile';

type ViewMode = 'REGISTER' | 'ANALYTICS';

interface UseCensusViewScreenModelParams {
  viewMode: ViewMode;
  selectedDay: number;
  selectedMonth: number;
  currentDateString: string;
  showBedManagerModal: boolean;
  onCloseBedManagerModal: () => void;
  readOnly: boolean;
  allowAdminCopyOverride: boolean;
  localViewMode: 'TABLE' | '3D';
  accessProfile: CensusAccessProfile;
}

export const useCensusViewScreenModel = ({
  viewMode,
  selectedDay,
  selectedMonth,
  currentDateString,
  showBedManagerModal,
  onCloseBedManagerModal,
  readOnly,
  allowAdminCopyOverride,
  localViewMode,
  accessProfile,
}: UseCensusViewScreenModelParams) => {
  const auth = useAuth();
  const routeModel = useCensusViewRouteModel({
    viewMode,
    selectedDay,
    selectedMonth,
    currentDateString,
    showBedManagerModal,
    onCloseBedManagerModal,
    readOnly,
    allowAdminCopyOverride,
    localViewMode,
    accessProfile,
  });
  const [resolvedTodayEmptyDate, setResolvedTodayEmptyDate] = useState('');
  const shouldDeferRemoteBootstrapEmptyState =
    routeModel.branch === 'empty' &&
    auth.isAuthenticated &&
    (auth.isLoading || auth.sessionState.status === 'authenticating' || !auth.isFirebaseConnected);
  const shouldDeferTodayEmptyState =
    routeModel.branch === 'empty' &&
    (currentDateString === getTodayISO() || shouldDeferRemoteBootstrapEmptyState);
  const emptyStateDeferMs = shouldDeferRemoteBootstrapEmptyState ? 12_000 : 1_200;

  useCensusMigrationBootstrap(routeModel.branch !== 'analytics');

  useEffect(() => {
    if (!shouldDeferTodayEmptyState) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setResolvedTodayEmptyDate(currentDateString);
    }, emptyStateDeferMs);

    return () => window.clearTimeout(timeoutId);
  }, [currentDateString, emptyStateDeferMs, shouldDeferTodayEmptyState]);

  return {
    ...routeModel,
    shouldDeferTodayEmptyState,
    resolvedTodayEmptyDate,
  };
};
