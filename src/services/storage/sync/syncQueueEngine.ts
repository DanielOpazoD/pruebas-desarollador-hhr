import type { DailyRecord } from '@/types';
import { logError } from '@/services/utils/errorService';
import { buildSyncErrorSummary, classifySyncError } from '@/services/storage/syncErrorCatalog';
import type { SyncTask } from '@/services/storage/syncQueueTypes';
import type {
  SyncQueueStorePort,
  SyncRuntimePort,
  SyncTransportPort,
} from '@/services/storage/sync/syncQueuePorts';
import { measureRepositoryOperation } from '@/services/repositories/repositoryPerformance';
import {
  buildSyncQueueDomainMetrics,
  normalizeSyncTaskContexts,
  resolveSyncDomainRetryProfile,
  type SyncQueueDomainMetrics,
} from '@/services/storage/sync/syncDomainPolicy';

export interface SyncQueueTelemetry {
  pending: number;
  failed: number;
  conflict: number;
  retrying: number;
  oldestPendingAgeMs: number;
  batchSize: number;
}

export interface SyncQueueOperationSnapshot {
  id?: number;
  type: SyncTask['type'];
  status: SyncTask['status'];
  retryCount: number;
  timestamp: number;
  nextAttemptAt?: number;
  error?: string;
  key?: string;
  contexts?: SyncTask['contexts'];
  origin?: SyncTask['origin'];
  recoveryPolicy?: SyncTask['recoveryPolicy'];
}

interface CreateSyncQueueEngineOptions {
  store: SyncQueueStorePort;
  runtime: SyncRuntimePort;
  transport: SyncTransportPort;
  batchSize: number;
  maxRetries: number;
  baseRetryDelayMs: number;
  maxRetryDelayMs: number;
}

const clearTaskErrorState = () => ({
  status: 'PENDING' as const,
  nextAttemptAt: 0,
  error: undefined,
  lastErrorCode: undefined,
  lastErrorCategory: undefined,
  lastErrorSeverity: undefined,
  lastErrorAction: undefined,
  lastErrorAt: undefined,
});

const buildTaskContextMeta = (task: Pick<SyncTask, 'contexts' | 'recoveryPolicy'>) => {
  const contexts = normalizeSyncTaskContexts(task.contexts);
  const domainProfile = resolveSyncDomainRetryProfile(contexts);
  return {
    contexts,
    recoveryPolicy: task.recoveryPolicy || domainProfile.id,
    domainProfile,
  };
};

const buildTaskErrorMeta = (error: unknown) => {
  const classification = classifySyncError(error);
  return {
    classification,
    errorMeta: {
      error: buildSyncErrorSummary(classification),
      lastErrorCode: classification.code,
      lastErrorCategory: classification.category,
      lastErrorSeverity: classification.severity,
      lastErrorAction: classification.recommendedAction,
      lastErrorAt: Date.now(),
    } as const,
  };
};

const getTaskKey = (type: SyncTask['type'], payload: unknown): string | undefined => {
  if (type === 'UPDATE_DAILY_RECORD') {
    const record = payload as DailyRecord;
    return record?.date ? `daily:${record.date}` : undefined;
  }

  return undefined;
};

const buildTelemetryFromRows = (
  rows: SyncTask[],
  now: number,
  batchSize: number
): SyncQueueTelemetry => {
  const pendingRows = rows.filter(row => row.status === 'PENDING');
  const oldestTimestamp = pendingRows.reduce<number>(
    (acc, row) => (row.timestamp < acc ? row.timestamp : acc),
    Number.POSITIVE_INFINITY
  );

  return {
    pending: pendingRows.length,
    failed: rows.filter(row => row.status === 'FAILED').length,
    conflict: rows.filter(row => row.status === 'CONFLICT').length,
    retrying: pendingRows.filter(row => row.retryCount > 0).length,
    oldestPendingAgeMs:
      Number.isFinite(oldestTimestamp) && oldestTimestamp > 0
        ? Math.max(0, now - oldestTimestamp)
        : 0,
    batchSize,
  };
};

export const createSyncQueueEngine = ({
  store,
  runtime,
  transport,
  batchSize,
  maxRetries,
  baseRetryDelayMs,
  maxRetryDelayMs,
}: CreateSyncQueueEngineOptions) => {
  let isProcessing = false;

  const computeBackoffMs = (attempt: number): number => {
    const jitter = Math.random() * 500;
    const delay = Math.min(baseRetryDelayMs * Math.pow(2, attempt - 1), maxRetryDelayMs);
    return delay + jitter;
  };

  const triggerProcessing = (): void => {
    if (!runtime.isOnline()) return;
    void processQueue();
  };

  const updateTaskState = async (
    taskId: number,
    patch: Partial<SyncTask> & { status: SyncTask['status'] }
  ): Promise<void> => {
    await store.update(taskId, patch);
  };

  const handleTaskFailure = async (task: SyncTask, error: unknown): Promise<void> => {
    if (!task.id) {
      return;
    }

    const { classification, errorMeta } = buildTaskErrorMeta(error);
    const { contexts, recoveryPolicy, domainProfile } = buildTaskContextMeta(task);
    console.error(`[SyncQueue] Task ${task.id} failed:`, error);

    if (classification.category === 'conflict') {
      await updateTaskState(task.id, {
        status: 'CONFLICT',
        contexts,
        recoveryPolicy,
        ...errorMeta,
        lastErrorAction: domainProfile.conflictAction,
      });
      return;
    }

    if (!classification.retryable) {
      await updateTaskState(task.id, {
        status: 'FAILED',
        retryCount: task.retryCount,
        contexts,
        recoveryPolicy,
        ...errorMeta,
      });
      return;
    }

    const newRetryCount = task.retryCount + 1;
    const retryBudget = Math.min(maxRetries, domainProfile.retryBudget);
    if (newRetryCount >= retryBudget) {
      await updateTaskState(task.id, {
        status: 'FAILED',
        retryCount: newRetryCount,
        contexts,
        recoveryPolicy,
        ...errorMeta,
      });
      logError('Sync task permanently failed', error instanceof Error ? error : undefined, {
        taskId: task.id,
        type: task.type,
        key: task.key,
        retryCount: newRetryCount,
        contexts,
        recoveryPolicy,
      });
      return;
    }

    await updateTaskState(task.id, {
      status: 'PENDING',
      retryCount: newRetryCount,
      nextAttemptAt:
        Date.now() + computeBackoffMs(newRetryCount) * Math.max(1, domainProfile.delayMultiplier),
      contexts,
      recoveryPolicy,
      ...errorMeta,
    });
  };

  const queueTask = async (
    type: SyncTask['type'],
    payload: unknown,
    meta?: Pick<SyncTask, 'contexts' | 'origin' | 'recoveryPolicy'>
  ): Promise<void> => {
    const key = getTaskKey(type, payload);
    const now = Date.now();
    const contextMeta = buildTaskContextMeta({
      contexts: meta?.contexts,
      recoveryPolicy: meta?.recoveryPolicy,
    });

    if (key) {
      const existing = await store.findReusableTask(type, key);
      if (existing?.id) {
        await store.update(existing.id, {
          payload,
          timestamp: now,
          retryCount: 0,
          key,
          contexts: contextMeta.contexts,
          origin: meta?.origin || existing.origin || 'direct_queue',
          recoveryPolicy: contextMeta.recoveryPolicy,
          ...clearTaskErrorState(),
        });
        triggerProcessing();
        return;
      }
    }

    await store.add({
      opId: `${type}:${key ?? 'global'}:${now}`,
      type,
      payload,
      timestamp: now,
      retryCount: 0,
      key,
      contexts: contextMeta.contexts,
      origin: meta?.origin || 'direct_queue',
      recoveryPolicy: contextMeta.recoveryPolicy,
      ...clearTaskErrorState(),
    });
    triggerProcessing();
  };

  const getTelemetry = async (): Promise<SyncQueueTelemetry> => {
    const rows = await store.listAll();
    return buildTelemetryFromRows(rows, Date.now(), batchSize);
  };

  const getStats = async (): Promise<{ pending: number; failed: number; conflict: number }> => {
    const telemetry = await getTelemetry();
    return {
      pending: telemetry.pending,
      failed: telemetry.failed,
      conflict: telemetry.conflict,
    };
  };

  const listRecentOperations = async (limit: number): Promise<SyncQueueOperationSnapshot[]> => {
    const rows = await store.listRecent(limit);
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      status: row.status,
      retryCount: row.retryCount,
      timestamp: row.timestamp,
      nextAttemptAt: row.nextAttemptAt,
      error: row.error,
      key: row.key,
      contexts: row.contexts,
      origin: row.origin,
      recoveryPolicy: row.recoveryPolicy,
    }));
  };

  const getDomainMetrics = async (): Promise<SyncQueueDomainMetrics> => {
    const rows = await store.listAll();
    return buildSyncQueueDomainMetrics(rows);
  };

  const processQueue = async (): Promise<void> => {
    if (isProcessing) return;
    isProcessing = true;

    try {
      await measureRepositoryOperation(
        'syncQueue.process',
        async () => {
          while (true) {
            const readyTasks = await store.listReadyPending(Date.now(), batchSize);
            if (readyTasks.length === 0) {
              return;
            }

            console.warn(`[SyncQueue] Processing ${readyTasks.length} pending tasks...`);

            for (const task of readyTasks) {
              if (!task.id) continue;

              try {
                await updateTaskState(task.id, { status: 'PROCESSING' });
                await transport.run(task);
                await store.delete(task.id);
              } catch (error) {
                await handleTaskFailure(task, error);
              }
            }

            if (readyTasks.length < batchSize) {
              return;
            }
          }
        },
        { thresholdMs: 250, context: `batch=${batchSize}` }
      );
    } finally {
      isProcessing = false;
    }
  };

  const ensureOnlineListener = (): void => {
    runtime.onOnline(() => {
      console.warn('[SyncQueue] Online detected, flushing queue...');
      triggerProcessing();
    });
  };

  return {
    queueTask,
    processQueue,
    getTelemetry,
    getDomainMetrics,
    getStats,
    listRecentOperations,
    ensureOnlineListener,
  };
};

export type { SyncQueueDomainMetrics } from '@/services/storage/sync/syncDomainPolicy';
