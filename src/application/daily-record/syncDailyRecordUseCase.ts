import type { DailyRecord } from '@/types';
import type { IDailyRecordRepository } from '@/services/repositories/DailyRecordRepository';
import type { SyncDailyRecordResult } from '@/services/repositories/contracts/dailyRecordResults';
import {
  createApplicationDegraded,
  createApplicationFailed,
  createApplicationPartial,
  createApplicationSuccess,
  type ApplicationOutcome,
  type UseCase,
} from '@/application/shared/applicationOutcome';

export type SyncDegradationReason = 'missing_remote_record' | 'remote_blocked';

export interface SyncOutcome {
  record: DailyRecord | null;
  sync: SyncDailyRecordResult | null;
  degradationReason?: SyncDegradationReason;
}

export interface SyncDailyRecordInput {
  date: string;
  repository: Pick<IDailyRecordRepository, 'syncWithFirestoreDetailed'>;
}

export class SyncDailyRecordUseCase implements UseCase<SyncDailyRecordInput, SyncOutcome> {
  async execute(input: SyncDailyRecordInput): Promise<ApplicationOutcome<SyncOutcome>> {
    try {
      const sync = await input.repository.syncWithFirestoreDetailed(input.date);

      if (!sync) {
        return createApplicationPartial(
          {
            record: null,
            sync: null,
            degradationReason: 'missing_remote_record',
          },
          [
            {
              kind: 'not_found',
              message: 'No hay fuente remota disponible para sincronizar este día.',
            },
          ]
        );
      }

      if (sync.outcome === 'blocked') {
        return createApplicationDegraded(
          {
            record: sync.record,
            sync,
            degradationReason: 'remote_blocked',
          },
          [
            {
              kind: 'remote_blocked',
              message: 'La sincronización remota quedó bloqueada; se mantiene la copia local.',
            },
          ]
        );
      }

      if (sync.outcome === 'missing') {
        return createApplicationPartial(
          {
            record: sync.record,
            sync,
            degradationReason: 'missing_remote_record',
          },
          [
            {
              kind: 'not_found',
              message: 'No se encontró registro remoto para este día.',
            },
          ]
        );
      }

      return createApplicationSuccess({
        record: sync.record,
        sync,
      });
    } catch (error) {
      return createApplicationFailed(
        {
          record: null,
          sync: null,
        },
        [
          {
            kind: 'unknown',
            message:
              error instanceof Error ? error.message : 'No se pudo completar la sincronización.',
          },
        ]
      );
    }
  }
}

export const executeSyncDailyRecord = async (
  input: SyncDailyRecordInput
): Promise<ApplicationOutcome<SyncOutcome>> => new SyncDailyRecordUseCase().execute(input);
