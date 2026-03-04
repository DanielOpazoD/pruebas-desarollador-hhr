import { useCallback } from 'react';
import { useNotification } from '@/context/UIContext';
import { logDailyRecordCreated, logDailyRecordDeleted } from '@/services/admin/auditService';
import {
  getForDateWithMeta,
  getPreviousDayWithMeta,
  initializeDayDetailed,
  deleteDay,
} from '@/services/repositories/DailyRecordRepository';
import { DailyRecord } from '@/types';
import { getUserFriendlyErrorMessage } from '@/services/utils/errorService';
import { hasCriticalLegacyRepairSignal } from '@/hooks/controllers/legacyRepairWarningController';
import { buildCreateDayNotifications } from '@/hooks/controllers/persistenceFeedbackController';

interface UsePersistenceProps {
  currentDateString: string;
  markLocalChange: () => void;
  setRecord: (record: DailyRecord | null) => void;
}

/**
 * Hook to manage day lifecycle and persistence operations.
 * Extracts "Create", "Delete", and "Demo" logic from useDailyRecord.
 */
export const usePersistence = ({
  currentDateString,
  markLocalChange,
  setRecord,
}: UsePersistenceProps) => {
  const { success, warning, error: notifyError } = useNotification();

  /**
   * Creates a new daily record for the current date.
   */
  const createDay = useCallback(
    async (copyFromPrevious: boolean, specificDate?: string) => {
      let prevDate: string | undefined = undefined;
      let copySourceMeta: {
        compatibilityIntensity: string;
        migrationRulesApplied: string[];
      } | null = null;

      try {
        if (copyFromPrevious) {
          if (specificDate) {
            const source = await getForDateWithMeta(specificDate, true);
            if (!source.record) {
              warning(
                'No se encontró registro anterior',
                'No hay datos del día seleccionado para copiar.'
              );
              return;
            }
            prevDate = source.record.date;
            copySourceMeta = source;
          } else {
            const prevRecord = await getPreviousDayWithMeta(currentDateString);
            if (prevRecord.record) {
              prevDate = prevRecord.record.date;
              copySourceMeta = prevRecord;
            } else {
              warning(
                'No se encontró registro anterior',
                'No hay datos del día previo para copiar.'
              );
              return;
            }
          }
        }

        const initResult = await initializeDayDetailed(currentDateString, prevDate);
        const newRecord = initResult.record;
        markLocalChange();
        setRecord(newRecord);

        const notifications = buildCreateDayNotifications({
          sourceDate: prevDate,
          outcome: initResult.outcome,
          hasCriticalLegacyRepair:
            hasCriticalLegacyRepairSignal(copySourceMeta) ||
            hasCriticalLegacyRepairSignal(initResult),
        });
        for (const notification of notifications) {
          if (notification.channel === 'success') {
            success(notification.title, notification.message);
          } else {
            warning(notification.title, notification.message);
          }
        }

        logDailyRecordCreated(
          currentDateString,
          copyFromPrevious ? specificDate || 'previous_day' : 'blank'
        );
      } catch (error) {
        notifyError('No se pudo crear el día', getUserFriendlyErrorMessage(error));
      }
    },
    [currentDateString, warning, success, notifyError, markLocalChange, setRecord]
  );

  /**
   * Deletes the current day's record.
   */
  const resetDay = useCallback(async () => {
    await deleteDay(currentDateString);
    setRecord(null);
    success('Registro eliminado', 'El registro del día ha sido eliminado.');

    logDailyRecordDeleted(currentDateString);
  }, [currentDateString, setRecord, success]);

  return {
    createDay,
    resetDay,
  };
};
