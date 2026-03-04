import { describe, expect, it } from 'vitest';
import {
  resolvePatchOutcomeFeedback,
  resolveSaveOutcomeFeedback,
} from '@/hooks/controllers/dailyRecordSyncNotificationController';

describe('dailyRecordSyncNotificationController', () => {
  it('returns feedback for queued and auto-merged save outcomes', () => {
    expect(
      resolveSaveOutcomeFeedback({
        date: '2026-03-03',
        outcome: 'queued',
        savedLocally: true,
        savedRemotely: false,
        queuedForRetry: true,
        autoMerged: false,
      })
    ).toEqual({
      title: 'Guardado local pendiente',
      message: 'Los cambios se guardaron localmente y quedarán pendientes de sincronización.',
    });

    expect(
      resolveSaveOutcomeFeedback({
        date: '2026-03-03',
        outcome: 'auto_merged',
        savedLocally: true,
        savedRemotely: false,
        queuedForRetry: false,
        autoMerged: true,
      })
    ).toEqual({
      title: 'Conflicto resuelto automáticamente',
      message: 'Se detectó un conflicto remoto y el sistema aplicó una fusión automática.',
    });
  });

  it('returns feedback for blocked patch outcomes', () => {
    expect(
      resolvePatchOutcomeFeedback({
        date: '2026-03-03',
        outcome: 'blocked',
        savedLocally: false,
        updatedRemotely: false,
        queuedForRetry: false,
        autoMerged: false,
        patchedFields: 1,
      })
    ).toEqual({
      title: 'Actualización bloqueada',
      message: 'No se encontró un registro local válido para aplicar el cambio.',
    });
  });
});
