/**
 * useDailyRecordSyncQuery Hook
 * Replaces useDailyRecordSync logic with TanStack Query.
 * Provides the same interface for compatibility.
 */

import { useCallback, useMemo, useEffect, useRef, useState } from 'react';
import {
  useDailyRecordQuery,
  useSaveDailyRecordMutation,
  usePatchDailyRecordMutation,
  useInitializeDailyRecordMutation,
  useDeleteDailyRecordMutation,
} from './useDailyRecordQuery';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../config/queryClient';
import { SyncStatus, UseDailyRecordSyncResult } from './useDailyRecordTypes';
import type { DailyRecord, DailyRecordPatch } from '@/hooks/contracts/dailyRecordHookContracts';
import { useRepositories } from '@/services/RepositoryContext';
import { useNotification } from '@/context/UIContext';
import { useVersion } from '@/context/VersionContext';
import {
  resolvePatchOutcomeFeedback,
  resolveSaveErrorFeedback,
  resolveSaveOutcomeFeedback,
} from '@/hooks/controllers/dailyRecordSyncNotificationController';
import {
  buildCreateDaySuccessMessage,
  resolveCreateDaySourceDate,
  resolveMutationSyncStatus,
} from '@/hooks/controllers/dailyRecordSyncController';
import { executeSyncDailyRecord } from '@/application/daily-record/syncDailyRecordUseCase';
import { presentDailyRecordRefreshOutcome } from '@/hooks/controllers/dailyRecordRefreshOutcomeController';
import { dailyRecordSyncLogger } from '@/hooks/hookLoggers';
import { dailyRecordObservability } from '@/services/repositories/dailyRecordOperationalTelemetry';
import { getTodayISO } from '@/utils/dateUtils';
import { setDailyRecordQueryData } from '@/hooks/controllers/dailyRecordQueryController';
import type { RemoteSyncRuntimeStatus } from '@/services/repositories/repositoryConfig';
import {
  describeDailyRecordBootstrapPhase,
  resolveDailyRecordBootstrapPhase,
  shouldAttemptTodayEmptyRecovery,
} from '@/hooks/controllers/dailyRecordBootstrapController';

const INITIAL_REMOTE_HYDRATION_GRACE_MS = 15_000;

export const useDailyRecordSyncQuery = (
  currentDateString: string,
  _isOfflineMode: boolean = false, // Handled implicitly by TanStack Query & Repository
  remoteSyncStatus: RemoteSyncRuntimeStatus = 'local_only'
): UseDailyRecordSyncResult => {
  const queryClient = useQueryClient();
  const { dailyRecord } = useRepositories();
  const { checkVersion } = useVersion();

  // 1. Fetching
  const {
    data: record,
    runtime: recordRuntime,
    dataUpdatedAt,
    refetch,
  } = useDailyRecordQuery(currentDateString, _isOfflineMode, remoteSyncStatus);

  // Monitor version in incoming records
  useEffect(() => {
    if (record?.schemaVersion) {
      checkVersion(record.schemaVersion);
    }
  }, [record, checkVersion]);

  // 2. Mutations
  const saveMutation = useSaveDailyRecordMutation();
  const patchMutation = usePatchDailyRecordMutation(currentDateString);
  const initMutation = useInitializeDailyRecordMutation();
  const deleteMutation = useDeleteDailyRecordMutation();
  const pendingRefetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const todayNullRecoveryAttemptedRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);
  const refreshRequestIdRef = useRef(0);
  const [remoteHydrationGraceResolvedDate, setRemoteHydrationGraceResolvedDate] = useState<
    string | null
  >(null);

  const clearPendingRefetchTimeout = useCallback(() => {
    if (pendingRefetchTimeoutRef.current !== null) {
      clearTimeout(pendingRefetchTimeoutRef.current);
      pendingRefetchTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      clearPendingRefetchTimeout();
    };
  }, [clearPendingRefetchTimeout]);

  const shouldWaitForInitialRemoteHydration = useMemo(
    () =>
      remoteSyncStatus === 'ready' &&
      !record &&
      recordRuntime?.availabilityState !== 'confirmed_missing',
    [record, recordRuntime?.availabilityState, remoteSyncStatus]
  );

  useEffect(() => {
    if (!shouldWaitForInitialRemoteHydration) {
      setRemoteHydrationGraceResolvedDate(null);
      return;
    }

    if (remoteHydrationGraceResolvedDate === currentDateString) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setRemoteHydrationGraceResolvedDate(currentDateString);
    }, INITIAL_REMOTE_HYDRATION_GRACE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [currentDateString, remoteHydrationGraceResolvedDate, shouldWaitForInitialRemoteHydration]);

  const bootstrapPhase = useMemo(
    () =>
      resolveDailyRecordBootstrapPhase({
        remoteSyncStatus,
        record,
        runtime: recordRuntime,
        gracePeriodExpired: remoteHydrationGraceResolvedDate === currentDateString,
      }),
    [currentDateString, record, recordRuntime, remoteHydrationGraceResolvedDate, remoteSyncStatus]
  );

  const previousBootstrapPhaseRef = useRef<typeof bootstrapPhase | null>(null);

  useEffect(() => {
    if (previousBootstrapPhaseRef.current === bootstrapPhase) {
      return;
    }

    previousBootstrapPhaseRef.current = bootstrapPhase;
    dailyRecordObservability.recordEvent(
      'daily_record_bootstrap_phase_changed',
      bootstrapPhase === 'record_ready' || bootstrapPhase === 'confirmed_empty'
        ? 'success'
        : 'degraded',
      {
        date: currentDateString,
        runtimeState:
          bootstrapPhase === 'remote_record_timeout'
            ? 'retryable'
            : bootstrapPhase === 'local_only'
              ? 'degraded'
              : 'recoverable',
        issues:
          bootstrapPhase === 'record_ready' || bootstrapPhase === 'confirmed_empty'
            ? undefined
            : [describeDailyRecordBootstrapPhase(bootstrapPhase)],
        context: {
          bootstrapPhase,
          remoteSyncStatus,
          availabilityState: recordRuntime?.availabilityState ?? 'unknown',
          sourceOfTruth: recordRuntime?.sourceOfTruth ?? 'unknown',
        },
      }
    );
  }, [bootstrapPhase, currentDateString, recordRuntime, remoteSyncStatus]);

  useEffect(() => {
    if (record) {
      if (todayNullRecoveryAttemptedRef.current === currentDateString) {
        todayNullRecoveryAttemptedRef.current = null;
      }
      return;
    }

    if (
      !shouldAttemptTodayEmptyRecovery({
        currentDateString,
        todayDateString: getTodayISO(),
        bootstrapPhase,
      })
    ) {
      return;
    }

    if (todayNullRecoveryAttemptedRef.current === currentDateString) {
      return;
    }

    todayNullRecoveryAttemptedRef.current = currentDateString;

    let cancelled = false;

    void executeSyncDailyRecord({
      date: currentDateString,
      repository: dailyRecord,
    }).then(outcome => {
      if (cancelled || !isMountedRef.current) {
        return;
      }

      dailyRecordObservability.recordOutcome('recover_today_empty_daily_record', outcome, {
        date: currentDateString,
        context: {
          source: 'useDailyRecordSyncQuery',
        },
      });
      void refetch();
    });

    return () => {
      cancelled = true;
    };
  }, [bootstrapPhase, currentDateString, dailyRecord, record, refetch]);

  // 3. Status Mapping
  const syncStatus = useMemo(
    (): SyncStatus =>
      resolveMutationSyncStatus([
        {
          isPending: saveMutation.isPending,
          isError: saveMutation.isError,
          isSuccess: saveMutation.isSuccess,
        },
        {
          isPending: patchMutation.isPending,
          isError: patchMutation.isError,
          isSuccess: patchMutation.isSuccess,
        },
        {
          isPending: initMutation.isPending,
          isError: initMutation.isError,
          isSuccess: initMutation.isSuccess,
        },
        {
          isPending: deleteMutation.isPending,
          isError: deleteMutation.isError,
          isSuccess: deleteMutation.isSuccess,
        },
      ]),
    [
      deleteMutation.isError,
      deleteMutation.isPending,
      deleteMutation.isSuccess,
      initMutation.isError,
      initMutation.isPending,
      initMutation.isSuccess,
      patchMutation.isError,
      patchMutation.isPending,
      patchMutation.isSuccess,
      saveMutation.isError,
      saveMutation.isPending,
      saveMutation.isSuccess,
    ]
  );

  const lastSyncTime = useMemo(
    () => (dataUpdatedAt ? new Date(dataUpdatedAt) : null),
    [dataUpdatedAt]
  );

  const { error: notifyError, success, warning } = useNotification();

  // 4. Compatibility handlers
  const saveAndUpdate = useCallback(
    async (updatedRecord: DailyRecord) => {
      try {
        const payload = await saveMutation.mutateAsync(updatedRecord);
        const feedback = resolveSaveOutcomeFeedback(payload.result);
        if (feedback) {
          if (feedback.channel === 'error') {
            notifyError(feedback.title, feedback.message);
          } else {
            warning(feedback.title, feedback.message);
          }
        }
      } catch (err) {
        const feedback = resolveSaveErrorFeedback(err);
        if (feedback) {
          notifyError(feedback.title, feedback.message);

          if (feedback.shouldLog) {
            dailyRecordSyncLogger.error(feedback.logLabel || 'Save blocked', err);
          }

          if (feedback.refetchDelayMs) {
            clearPendingRefetchTimeout();
            pendingRefetchTimeoutRef.current = setTimeout(() => {
              refetch();
              pendingRefetchTimeoutRef.current = null;
            }, feedback.refetchDelayMs);
          }
        }
        throw err;
      }
    },
    [saveMutation, notifyError, refetch, clearPendingRefetchTimeout, warning]
  );

  const patchRecord = useCallback(
    async (partial: DailyRecordPatch) => {
      const payload = await patchMutation.mutateAsync(partial);
      const feedback = resolvePatchOutcomeFeedback(payload.result);
      if (feedback) {
        if (feedback.channel === 'error') {
          notifyError(feedback.title, feedback.message);
        } else {
          warning(feedback.title, feedback.message);
        }
      }
    },
    [patchMutation, warning, notifyError]
  );

  const setRecord = useCallback(
    (updater: DailyRecord | null | ((prev: DailyRecord | null) => DailyRecord | null)) => {
      const key = queryKeys.dailyRecord.byDate(currentDateString);
      setDailyRecordQueryData(queryClient, currentDateString, updater);
      queryClient.invalidateQueries({ queryKey: key });
    },
    [queryClient, currentDateString]
  );

  const markLocalChange = useCallback(() => {
    // TanStack Query handles local changes via optimistic updates in mutations.
    // For ad-hoc changes not through mutations, we can manual update cache if needed.
  }, []);

  const refresh = useCallback(() => {
    const requestId = ++refreshRequestIdRef.current;

    void executeSyncDailyRecord({
      date: currentDateString,
      repository: dailyRecord,
    }).then(outcome => {
      if (!isMountedRef.current || requestId !== refreshRequestIdRef.current) {
        return;
      }

      dailyRecordObservability.recordOutcome('refresh_daily_record', outcome, {
        date: currentDateString,
      });
      const notice = presentDailyRecordRefreshOutcome(outcome);
      if (notice.channel === 'warning') {
        warning(notice.title || 'Sincronización', notice.message);
      } else if (notice.channel === 'error') {
        notifyError(notice.title || 'Sincronización', notice.message);
      }
      void refetch();
    });
  }, [currentDateString, dailyRecord, refetch, warning, notifyError]);

  const createDay = useCallback(
    async (copyFromPrevious: boolean, specificDate?: string) => {
      const prevDate = await resolveCreateDaySourceDate(
        dailyRecord,
        currentDateString,
        copyFromPrevious,
        specificDate,
        warning
      );
      if (prevDate === null) {
        return;
      }

      await initMutation.mutateAsync({ date: currentDateString, copyFromDate: prevDate });
      success('Día creado', buildCreateDaySuccessMessage(prevDate || undefined));
    },
    [currentDateString, initMutation, success, warning, dailyRecord]
  );

  const resetDay = useCallback(async () => {
    await deleteMutation.mutateAsync(currentDateString);
    success('Registro eliminado', 'El registro del día ha sido eliminado.');
  }, [currentDateString, deleteMutation, success]);

  return {
    record: record ?? null,
    setRecord,
    syncStatus,
    lastSyncTime,
    bootstrapPhase,
    saveAndUpdate,
    patchRecord,
    markLocalChange,
    refresh,
    createDay,
    resetDay,
  };
};
