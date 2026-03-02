/**
 * Sync Queue Service (Outbox Pattern)
 *
 * Manages a queue of pending mutations to be synced with Firestore when online.
 * This ensures data consistency even if the user closes the app while offline
 * or if a write fails due to network instability.
 */

import { db } from '../infrastructure/db';
import { hospitalDB as indexedDB } from './indexedDBService';
import { ensureDbReady } from './indexeddb/indexedDbCore';
import type { SyncTask } from './syncQueueTypes';
import { DailyRecord } from '@/types';
import { getDailyRecordsPath } from '@/constants/firestorePaths';
import { logError } from '@/services/utils/errorService';
import { buildSyncErrorSummary, classifySyncError } from '@/services/storage/syncErrorCatalog';

const MAX_RETRIES = 5;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
let isProcessing = false;
let onlineListenerRegistered = false;

const isBrowserOnline = (): boolean => typeof navigator !== 'undefined' && navigator.onLine;

const triggerSyncQueueProcessing = (): void => {
  if (!isBrowserOnline()) return;
  void processSyncQueue();
};

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

const updateExistingTask = async (
  taskId: number,
  payload: unknown,
  timestamp: number
): Promise<void> => {
  await indexedDB.syncQueue.update(taskId, {
    payload,
    timestamp,
    ...clearTaskErrorState(),
  });
  triggerSyncQueueProcessing();
};

const addNewTask = async (
  type: SyncTask['type'],
  payload: unknown,
  timestamp: number,
  key?: string
): Promise<void> => {
  await indexedDB.syncQueue.add({
    opId: `${type}:${key ?? 'global'}:${timestamp}`,
    type,
    payload,
    timestamp,
    retryCount: 0,
    key,
    ...clearTaskErrorState(),
  });
  triggerSyncQueueProcessing();
};

const runTask = async (task: SyncTask): Promise<void> => {
  switch (task.type) {
    case 'UPDATE_DAILY_RECORD':
      await syncDailyRecord(task.payload as DailyRecord);
      break;
  }
};

const markTaskConflict = async (
  taskId: number,
  errorMeta: ReturnType<typeof buildTaskErrorMeta>['errorMeta']
) => {
  await indexedDB.syncQueue.update(taskId, {
    status: 'CONFLICT',
    ...errorMeta,
  });
};

const markTaskFailed = async (
  taskId: number,
  retryCount: number,
  errorMeta: ReturnType<typeof buildTaskErrorMeta>['errorMeta']
) => {
  await indexedDB.syncQueue.update(taskId, {
    status: 'FAILED',
    retryCount,
    ...errorMeta,
  });
};

const rescheduleTask = async (
  taskId: number,
  retryCount: number,
  errorMeta: ReturnType<typeof buildTaskErrorMeta>['errorMeta']
) => {
  await indexedDB.syncQueue.update(taskId, {
    status: 'PENDING',
    retryCount,
    nextAttemptAt: Date.now() + computeBackoffMs(retryCount),
    ...errorMeta,
  });
};

const computeBackoffMs = (attempt: number): number => {
  const jitter = Math.random() * 500;
  const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MS);
  return delay + jitter;
};

const getTaskKey = (type: SyncTask['type'], payload: unknown): string | undefined => {
  if (type === 'UPDATE_DAILY_RECORD') {
    const record = payload as DailyRecord;
    return record?.date ? `daily:${record.date}` : undefined;
  }
  return undefined;
};

export const isConflictSyncError = (error: unknown): boolean => {
  return classifySyncError(error).category === 'conflict';
};

export const isRetryableSyncError = (error: unknown): boolean => {
  return classifySyncError(error).retryable;
};

export const getSyncQueueStats = async (): Promise<{
  pending: number;
  failed: number;
  conflict: number;
}> => {
  try {
    const telemetry = await getSyncQueueTelemetry();
    return {
      pending: telemetry.pending,
      failed: telemetry.failed,
      conflict: telemetry.conflict,
    };
  } catch (error) {
    console.warn('[SyncQueue] Failed to read queue stats:', error);
    return { pending: 0, failed: 0, conflict: 0 };
  }
};

export interface SyncQueueTelemetry {
  pending: number;
  failed: number;
  conflict: number;
  retrying: number;
  oldestPendingAgeMs: number;
}

export const getSyncQueueTelemetry = async (): Promise<SyncQueueTelemetry> => {
  try {
    await ensureDbReady();
    const now = Date.now();
    const rows = await indexedDB.syncQueue.toArray();
    const pendingRows = rows.filter(row => row.status === 'PENDING');

    const pending = pendingRows.length;
    const failed = rows.filter(row => row.status === 'FAILED').length;
    const conflict = rows.filter(row => row.status === 'CONFLICT').length;
    const retrying = pendingRows.filter(row => row.retryCount > 0).length;
    const oldestTimestamp = pendingRows.reduce<number>(
      (acc, row) => (row.timestamp < acc ? row.timestamp : acc),
      Number.POSITIVE_INFINITY
    );
    const oldestPendingAgeMs =
      Number.isFinite(oldestTimestamp) && oldestTimestamp > 0
        ? Math.max(0, now - oldestTimestamp)
        : 0;

    return { pending, failed, conflict, retrying, oldestPendingAgeMs };
  } catch (error) {
    console.warn('[SyncQueue] Failed to read queue telemetry:', error);
    return { pending: 0, failed: 0, conflict: 0, retrying: 0, oldestPendingAgeMs: 0 };
  }
};

/**
 * Adds a task to the sync queue.
 */
export const queueSyncTask = async (type: SyncTask['type'], payload: unknown): Promise<void> => {
  try {
    await ensureDbReady();
    const key = getTaskKey(type, payload);
    const now = Date.now();

    if (key) {
      const existing = await indexedDB.syncQueue.where('type').equals(type).toArray();

      const match = existing.find(task => task.key === key && task.status !== 'FAILED');

      if (match?.id) {
        await updateExistingTask(match.id, payload, now);
        return;
      }
    }

    await addNewTask(type, payload, now, key);
  } catch (error) {
    console.error('[SyncQueue] Failed to queue task:', error);
  }
};

/**
 * Processes pending tasks in the queue.
 */
export const processSyncQueue = async (): Promise<void> => {
  if (isProcessing) return;
  isProcessing = true;

  try {
    await ensureDbReady();

    const now = Date.now();
    const tasks = await indexedDB.syncQueue.where('status').equals('PENDING').sortBy('timestamp');

    const readyTasks = tasks.filter(task => (task.nextAttemptAt || 0) <= now);
    if (readyTasks.length === 0) {
      return;
    }

    console.warn(`[SyncQueue] Processing ${readyTasks.length} pending tasks...`);

    for (const task of readyTasks) {
      if (!task.id) continue;

      try {
        await indexedDB.syncQueue.update(task.id, { status: 'PROCESSING' });
        await runTask(task);

        await indexedDB.syncQueue.delete(task.id);
        console.warn(`[SyncQueue] Task ${task.id} completed successfully.`);
      } catch (error) {
        const { classification, errorMeta } = buildTaskErrorMeta(error);
        console.error(`[SyncQueue] Task ${task.id} failed:`, error);

        if (classification.category === 'conflict') {
          await markTaskConflict(task.id, errorMeta);
          continue;
        }

        if (!classification.retryable) {
          await markTaskFailed(task.id, task.retryCount, errorMeta);
          continue;
        }

        const newRetryCount = task.retryCount + 1;

        if (newRetryCount >= MAX_RETRIES) {
          await markTaskFailed(task.id, newRetryCount, errorMeta);
          logError('Sync task permanently failed', error instanceof Error ? error : undefined, {
            taskId: task.id,
            type: task.type,
            key: task.key,
            retryCount: newRetryCount,
          });
        } else {
          await rescheduleTask(task.id, newRetryCount, errorMeta);
        }
      }
    }
  } finally {
    isProcessing = false;
  }
};

/**
 * Executes the Firestore write for a DailyRecord.
 */
async function syncDailyRecord(record: DailyRecord): Promise<void> {
  const path = getDailyRecordsPath();
  await db.setDoc(path, record.date, record, { merge: true });
}

export const ensureSyncQueueOnlineListener = (): void => {
  if (onlineListenerRegistered || typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    console.warn('[SyncQueue] Online detected, flushing queue...');
    triggerSyncQueueProcessing();
  });

  onlineListenerRegistered = true;
};

// Auto-start processing when coming online.
ensureSyncQueueOnlineListener();
