import { useCallback, useMemo } from 'react';
import type {
  CensusActionCommandsContextType,
  CensusActionStateContextType,
} from '@/features/census/types/censusActionContextTypes';
import { useLatestRef } from '@/hooks/useLatestRef';

interface UseCensusActionContextValuesParams {
  actionState: CensusActionStateContextType['actionState'];
  setActionState: CensusActionStateContextType['setActionState'];
  dischargeState: CensusActionStateContextType['dischargeState'];
  setDischargeState: CensusActionStateContextType['setDischargeState'];
  transferState: CensusActionStateContextType['transferState'];
  setTransferState: CensusActionStateContextType['setTransferState'];
  executeMoveOrCopy: CensusActionCommandsContextType['executeMoveOrCopy'];
  executeDischarge: CensusActionCommandsContextType['executeDischarge'];
  handleEditDischarge: CensusActionCommandsContextType['handleEditDischarge'];
  executeTransfer: CensusActionCommandsContextType['executeTransfer'];
  handleEditTransfer: CensusActionCommandsContextType['handleEditTransfer'];
  handleRowAction: CensusActionCommandsContextType['handleRowAction'];
}

interface UseCensusActionContextValuesResult {
  stateValue: CensusActionStateContextType;
  commandsValue: CensusActionCommandsContextType;
}

export const useCensusActionContextValues = ({
  actionState,
  setActionState,
  dischargeState,
  setDischargeState,
  transferState,
  setTransferState,
  executeMoveOrCopy,
  executeDischarge,
  handleEditDischarge,
  executeTransfer,
  handleEditTransfer,
  handleRowAction,
}: UseCensusActionContextValuesParams): UseCensusActionContextValuesResult => {
  const executeMoveOrCopyRef = useLatestRef(executeMoveOrCopy);
  const executeDischargeRef = useLatestRef(executeDischarge);
  const handleEditDischargeRef = useLatestRef(handleEditDischarge);
  const executeTransferRef = useLatestRef(executeTransfer);
  const handleEditTransferRef = useLatestRef(handleEditTransfer);
  const handleRowActionRef = useLatestRef(handleRowAction);

  const stableExecuteMoveOrCopy = useCallback(
    (targetDate?: string) => executeMoveOrCopyRef.current(targetDate),
    [executeMoveOrCopyRef]
  );
  const stableExecuteDischarge = useCallback(
    (
      data?: CensusActionCommandsContextType['executeDischarge'] extends (arg: infer T) => void
        ? T
        : never
    ) => executeDischargeRef.current(data),
    [executeDischargeRef]
  );
  const stableHandleEditDischarge = useCallback(
    (
      data: CensusActionCommandsContextType['handleEditDischarge'] extends (arg: infer T) => void
        ? T
        : never
    ) => handleEditDischargeRef.current(data),
    [handleEditDischargeRef]
  );
  const stableExecuteTransfer = useCallback(
    (
      data?: CensusActionCommandsContextType['executeTransfer'] extends (arg: infer T) => void
        ? T
        : never
    ) => executeTransferRef.current(data),
    [executeTransferRef]
  );
  const stableHandleEditTransfer = useCallback(
    (
      data: CensusActionCommandsContextType['handleEditTransfer'] extends (arg: infer T) => void
        ? T
        : never
    ) => handleEditTransferRef.current(data),
    [handleEditTransferRef]
  );
  const stableHandleRowAction = useCallback(
    (...args: Parameters<CensusActionCommandsContextType['handleRowAction']>) =>
      handleRowActionRef.current(...args),
    [handleRowActionRef]
  );

  const stateValue = useMemo<CensusActionStateContextType>(
    () => ({
      actionState,
      setActionState,
      dischargeState,
      setDischargeState,
      transferState,
      setTransferState,
    }),
    [
      actionState,
      dischargeState,
      setActionState,
      setDischargeState,
      setTransferState,
      transferState,
    ]
  );

  const commandsValue = useMemo<CensusActionCommandsContextType>(
    () => ({
      executeMoveOrCopy: stableExecuteMoveOrCopy,
      executeDischarge: stableExecuteDischarge,
      handleEditDischarge: stableHandleEditDischarge,
      executeTransfer: stableExecuteTransfer,
      handleEditTransfer: stableHandleEditTransfer,
      handleRowAction: stableHandleRowAction,
    }),
    [
      stableExecuteMoveOrCopy,
      stableExecuteDischarge,
      stableHandleEditDischarge,
      stableExecuteTransfer,
      stableHandleEditTransfer,
      stableHandleRowAction,
    ]
  );

  return {
    stateValue,
    commandsValue,
  };
};
