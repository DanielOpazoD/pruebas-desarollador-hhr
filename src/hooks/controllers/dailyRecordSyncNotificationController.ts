import { ConcurrencyError } from '@/services/storage/firestore';
import { DataRegressionError, VersionMismatchError } from '@/utils/integrityGuard';
import type {
  SaveDailyRecordResult,
  UpdatePartialDailyRecordResult,
} from '@/services/repositories/contracts/dailyRecordResults';
import { isDailyRecordWriteBlockedResult } from '@/services/repositories/contracts/dailyRecordResults';
import {
  createBlockedNotice,
  createDegradedNotice,
  createRetryingNotice,
  type OperationalNotice,
} from '@/shared/feedback/operationalNoticePolicy';

interface SaveErrorFeedback {
  title: string;
  message: string;
  refetchDelayMs?: number;
  shouldLog?: boolean;
  logLabel?: string;
}

export const resolveSaveErrorFeedback = (error: unknown): SaveErrorFeedback | null => {
  if (error instanceof ConcurrencyError) {
    return {
      title: 'Conflicto de Edición',
      message: error.message,
      refetchDelayMs: 2000,
    };
  }

  if (error instanceof DataRegressionError) {
    return {
      title: 'Protección de Datos',
      message: error.message,
      refetchDelayMs: 3000,
      shouldLog: true,
      logLabel: '[Sync] Data regression blocked:',
    };
  }

  if (error instanceof VersionMismatchError) {
    return {
      title: 'Versión de Datos Antigua',
      message: error.message,
      refetchDelayMs: 5000,
      shouldLog: true,
      logLabel: '[Sync] Version mismatch blocked save:',
    };
  }

  return null;
};

interface SyncOutcomeFeedback {
  channel: 'warning' | 'error';
  title: string;
  message: string;
  state: OperationalNotice['state'];
  actionRequired: boolean;
}

const createSyncRetrying = (title: string, message: string): SyncOutcomeFeedback => ({
  ...createRetryingNotice(title, message),
  channel: 'warning',
});

const createSyncDegraded = (title: string, message: string): SyncOutcomeFeedback => ({
  ...createDegradedNotice(title, message),
  channel: 'warning',
});

const createSyncBlocked = (title: string, message: string): SyncOutcomeFeedback => ({
  ...createBlockedNotice(title, message),
  channel: 'error',
});

export const resolveSaveOutcomeFeedback = (
  result: SaveDailyRecordResult | null | undefined
): SyncOutcomeFeedback | null => {
  if (!result) {
    return null;
  }

  if (result.outcome === 'queued') {
    return createSyncRetrying(
      'Guardado local pendiente',
      'Los cambios se guardaron localmente y quedarán pendientes de sincronización.'
    );
  }

  if (result.outcome === 'auto_merged') {
    return createSyncDegraded(
      'Conflicto resuelto automáticamente',
      'Se detectó un conflicto remoto y el sistema aplicó una fusión automática.'
    );
  }

  if (result.consistencyState === 'unrecoverable') {
    return createSyncDegraded(
      'Guardado local sin sincronización',
      result.userSafeMessage ||
        'Los cambios quedaron guardados localmente, pero la sincronización remota requiere revisión manual.'
    );
  }

  if (isDailyRecordWriteBlockedResult(result)) {
    return createSyncBlocked(
      result.consistencyState === 'blocked_regression'
        ? 'Protección de Datos'
        : 'Versión de Datos Antigua',
      result.userSafeMessage ||
        'La operación quedó bloqueada por una validación de consistencia remota.'
    );
  }

  return null;
};

export const resolvePatchOutcomeFeedback = (
  result: UpdatePartialDailyRecordResult | null | undefined
): SyncOutcomeFeedback | null => {
  if (!result) {
    return null;
  }

  if (result.outcome === 'blocked') {
    return createSyncBlocked(
      'Actualización bloqueada',
      'No se encontró un registro local válido para aplicar el cambio.'
    );
  }

  if (result.outcome === 'queued') {
    return createSyncRetrying(
      'Cambio pendiente de sincronización',
      'La actualización quedó guardada localmente y se reintentará la sincronización.'
    );
  }

  if (result.outcome === 'auto_merged') {
    return createSyncDegraded(
      'Cambio fusionado automáticamente',
      'Se resolvió un conflicto remoto sin intervención manual.'
    );
  }

  if (result.consistencyState === 'unrecoverable') {
    return createSyncDegraded(
      'Cambio local sin sincronización',
      result.userSafeMessage ||
        'El cambio quedó guardado localmente, pero la sincronización remota requiere revisión manual.'
    );
  }

  if (isDailyRecordWriteBlockedResult(result)) {
    return createSyncBlocked(
      result.consistencyState === 'blocked_regression'
        ? 'Protección de Datos'
        : 'Versión de Datos Antigua',
      result.userSafeMessage ||
        'La actualización quedó bloqueada por una validación de consistencia remota.'
    );
  }

  return null;
};
