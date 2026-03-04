import { ConcurrencyError } from '@/services/storage/firestoreService';
import { DataRegressionError, VersionMismatchError } from '@/utils/integrityGuard';
import type {
  SaveDailyRecordResult,
  UpdatePartialDailyRecordResult,
} from '@/services/repositories/contracts/dailyRecordResults';

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
  title: string;
  message: string;
}

export const resolveSaveOutcomeFeedback = (
  result: SaveDailyRecordResult | null | undefined
): SyncOutcomeFeedback | null => {
  if (!result) {
    return null;
  }

  if (result.outcome === 'queued') {
    return {
      title: 'Guardado local pendiente',
      message: 'Los cambios se guardaron localmente y quedarán pendientes de sincronización.',
    };
  }

  if (result.outcome === 'auto_merged') {
    return {
      title: 'Conflicto resuelto automáticamente',
      message: 'Se detectó un conflicto remoto y el sistema aplicó una fusión automática.',
    };
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
    return {
      title: 'Actualización bloqueada',
      message: 'No se encontró un registro local válido para aplicar el cambio.',
    };
  }

  if (result.outcome === 'queued') {
    return {
      title: 'Cambio pendiente de sincronización',
      message: 'La actualización quedó guardada localmente y se reintentará la sincronización.',
    };
  }

  if (result.outcome === 'auto_merged') {
    return {
      title: 'Cambio fusionado automáticamente',
      message: 'Se resolvió un conflicto remoto sin intervención manual.',
    };
  }

  return null;
};
