import { useStaffContext } from '@/context/StaffContext';
import { useDailyRecordData } from '@/context/DailyRecordContext';
import {
  useCensusActionCommands,
  useCensusActionState,
} from '@/features/census/context/censusActionContexts';
import { useCensusActionModalProps } from '@/features/census/hooks/useCensusActionModalProps';
import { useCensusModalBindings } from '@/features/census/hooks/useCensusModalBindings';
import { useCensusModalsHandlers } from '@/features/census/hooks/useCensusModalsHandlers';

export const useCensusModalsModel = () => {
  const staffContext = useStaffContext();
  const { record } = useDailyRecordData();
  const {
    actionState,
    setActionState,
    dischargeState,
    setDischargeState,
    transferState,
    setTransferState,
  } = useCensusActionState();
  const { executeMoveOrCopy, executeDischarge, executeTransfer } = useCensusActionCommands();

  const modalBindings = useCensusModalBindings({ actionState, dischargeState, transferState });
  const modalHandlers = useCensusModalsHandlers({
    setActionState,
    setDischargeState,
    setTransferState,
  });
  const actionModalProps = useCensusActionModalProps({
    modalBindings,
    modalHandlers,
    recordDate: record?.date || '',
    actionCommands: {
      executeMoveOrCopy,
      executeDischarge,
      executeTransfer,
    },
  });

  return {
    staffContext,
    actionModalProps,
  };
};
