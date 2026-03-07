import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';

import { applyDischargePatch } from '@/features/census/controllers/censusModalStateController';
import { buildDischargeRuntimeActions } from '@/features/census/controllers/censusActionRuntimeAdapterController';
import { buildDischargeWithActiveTransferConfirmDialog } from '@/features/census/controllers/censusMovementActionConfirmController';
import { executeDischargeController } from '@/features/census/controllers/censusActionRuntimeController';
import {
  buildDischargeErrorNotification,
  type CensusActionNotification,
} from '@/features/census/controllers/censusActionNotificationController';
import type { CensusActionRuntimeRefs } from '@/features/census/hooks/useCensusActionRuntimeRefs';
import { useConfirmedMovementAction } from '@/features/census/hooks/useConfirmedMovementAction';
import { useSingleFlightAsyncCommand } from '@/features/census/hooks/useSingleFlightAsyncCommand';
import type { DischargeExecutionInput } from '@/features/census/domain/movements/contracts';
import type { DischargeState } from '@/features/census/types/censusActionTypes';
import { getLatestOpenTransferRequestByBedId } from '@/services/transfers/transferService';

interface UseCensusDischargeCommandParams extends Pick<
  CensusActionRuntimeRefs,
  | 'dischargeStateRef'
  | 'recordRef'
  | 'stabilityRulesRef'
  | 'addDischargeRef'
  | 'updateDischargeRef'
  | 'confirmRef'
> {
  setDischargeState: Dispatch<SetStateAction<DischargeState>>;
  getCurrentTime: () => string;
  notifyError: (notification: CensusActionNotification) => void;
}

export const useCensusDischargeCommand = ({
  dischargeStateRef,
  recordRef,
  stabilityRulesRef,
  addDischargeRef,
  updateDischargeRef,
  confirmRef,
  setDischargeState,
  getCurrentTime,
  notifyError,
}: UseCensusDischargeCommandParams) => {
  const { runSingleFlight: runDischargeSingleFlight } = useSingleFlightAsyncCommand();
  const runConfirmedMovementAction = useConfirmedMovementAction({
    confirm: options =>
      confirmRef.current({
        title: options.title || 'Confirmar acción',
        message: options.message,
        confirmText: options.confirmText,
        cancelText: options.cancelText,
        variant: options.variant,
        requireInputConfirm: options.requireInputConfirm,
      }),
    notifyError: (title, message) =>
      notifyError({ title, message: message || 'No se pudo completar la confirmación del alta.' }),
  });

  return useCallback(
    (data?: DischargeExecutionInput) => {
      const started = runDischargeSingleFlight(async () => {
        const executeDischarge = async () => {
          const result = executeDischargeController({
            dischargeState: dischargeStateRef.current,
            data,
            stabilityRules: stabilityRulesRef.current,
            nowTime: getCurrentTime(),
            actions: buildDischargeRuntimeActions(
              addDischargeRef.current,
              updateDischargeRef.current
            ),
          });

          if (!result.ok) {
            notifyError(buildDischargeErrorNotification(result.error.code, result.error.message));
            return;
          }

          setDischargeState(prev => applyDischargePatch(prev, result.value.closeModalPatch));
        };

        const dischargeState = dischargeStateRef.current;
        const bedId = dischargeState.bedId;

        if (!bedId || dischargeState.recordId) {
          await executeDischarge();
          return;
        }

        try {
          const activeTransfer = await getLatestOpenTransferRequestByBedId(bedId);
          if (!activeTransfer) {
            await executeDischarge();
            return;
          }

          const patientName = recordRef.current?.beds?.[bedId]?.patientName;

          await runConfirmedMovementAction({
            dialog: buildDischargeWithActiveTransferConfirmDialog(patientName),
            run: executeDischarge,
            errorTitle: 'No se pudo confirmar el alta',
          });
        } catch (error) {
          console.warn(
            `[Census Discharge] Failed to validate active transfer context for bed ${bedId}:`,
            error
          );
          await executeDischarge();
        }
      });

      if (!started) return;
    },
    [
      addDischargeRef,
      dischargeStateRef,
      getCurrentTime,
      notifyError,
      recordRef,
      runConfirmedMovementAction,
      runDischargeSingleFlight,
      setDischargeState,
      stabilityRulesRef,
      updateDischargeRef,
    ]
  );
};
