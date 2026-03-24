import { useDailyRecordMovementActions } from '@/context/useDailyRecordScopedActions';
import { useCensusActionCommands } from '../context/censusActionContexts';
import { useCensusMovementData } from './useCensusMovementData';
import { useMovementSectionModel } from './useMovementSectionModel';
import {
  TRANSFER_DELETE_CONFIRM_DIALOG,
  TRANSFER_UNDO_CONFIRM_DIALOG,
} from '../controllers/censusMovementActionConfirmController';

export const useTransfersSectionModel = () => {
  const { recordDate, transfers } = useCensusMovementData();
  const { undoTransfer, deleteTransfer } = useDailyRecordMovementActions();
  const { handleEditTransfer } = useCensusActionCommands();
  const sectionModel = useMovementSectionModel({
    items: transfers,
    undoDialog: TRANSFER_UNDO_CONFIRM_DIALOG,
    undoErrorTitle: 'No se pudo deshacer traslado',
    onUndo: undoTransfer,
    deleteDialog: TRANSFER_DELETE_CONFIRM_DIALOG,
    deleteErrorTitle: 'No se pudo eliminar traslado',
    onDelete: deleteTransfer,
  });

  return {
    recordDate,
    sectionModel,
    handleEditTransfer,
  };
};
