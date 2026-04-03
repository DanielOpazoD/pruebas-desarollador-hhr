import type { Dispatch, SetStateAction } from 'react';

import { applyDischargePatch } from '@/features/census/controllers/censusModalStateController';
import { buildDischargeRuntimeActions } from '@/features/census/controllers/censusActionRuntimeAdapterController';
import { executeDischargeController } from '@/features/census/controllers/censusActionRuntimeController';
import {
  buildDischargeErrorNotification,
  type CensusActionNotification,
} from '@/features/census/controllers/censusActionNotificationController';
import { runDischargeWithTransferGuard } from '@/features/census/controllers/censusDischargeTransferGuardController';
import type { CensusActionRuntimeRefs } from '@/features/census/hooks/useCensusActionRuntimeRefs';
import { useCensusModalCommand } from '@/features/census/hooks/useCensusModalCommand';
import { useConfirmedMovementAction } from '@/features/census/hooks/useConfirmedMovementAction';
import type { DischargeExecutionInput } from '@/features/census/domain/movements/contracts';
import type { DischargeState } from '@/features/census/types/censusActionTypes';
import { getLatestOpenTransferRequestByBedId } from '@/services/transfers/transferService';
import { createScopedLogger } from '@/services/utils/loggerScope';

const censusDischargeCommandLogger = createScopedLogger('CensusDischargeCommand');

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

  return useCensusModalCommand<DischargeExecutionInput>(async data => {
    const executeDischarge = async () => {
      const result = executeDischargeController({
        dischargeState: dischargeStateRef.current,
        data,
        stabilityRules: stabilityRulesRef.current,
        nowTime: getCurrentTime(),
        actions: buildDischargeRuntimeActions(addDischargeRef.current, updateDischargeRef.current),
      });

      if (!result.ok) {
        notifyError(buildDischargeErrorNotification(result.error.code, result.error.message));
        return;
      }

      setDischargeState(prev => applyDischargePatch(prev, result.value.closeModalPatch));
    };

    await runDischargeWithTransferGuard({
      dischargeState: dischargeStateRef.current,
      record: recordRef.current,
      executeDischarge,
      runConfirmedMovementAction,
      getLatestOpenTransferRequestByBedId,
      warn: (message, error) => censusDischargeCommandLogger.warn(message, error),
    });
  });
};
