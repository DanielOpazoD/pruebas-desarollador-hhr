import { useDailyRecordMovementActions } from '@/context/useDailyRecordScopedActions';
import { useCensusActionCommands } from '../context/censusActionContexts';
import { useCensusMovementData } from './useCensusMovementData';
import { useMovementSectionModel } from './useMovementSectionModel';
import {
  DISCHARGE_DELETE_CONFIRM_DIALOG,
  DISCHARGE_UNDO_CONFIRM_DIALOG,
} from '../controllers/censusMovementActionConfirmController';

export const useDischargesSectionModel = () => {
  const { recordDate, discharges } = useCensusMovementData();
  const { undoDischarge, deleteDischarge, updateDischarge } = useDailyRecordMovementActions();
  const { handleEditDischarge } = useCensusActionCommands();
  const sectionModel = useMovementSectionModel({
    items: discharges,
    undoDialog: DISCHARGE_UNDO_CONFIRM_DIALOG,
    undoErrorTitle: 'No se pudo deshacer alta',
    onUndo: undoDischarge,
    deleteDialog: DISCHARGE_DELETE_CONFIRM_DIALOG,
    deleteErrorTitle: 'No se pudo eliminar alta',
    onDelete: deleteDischarge,
  });

  return {
    recordDate,
    sectionModel,
    handleEditDischarge,
    updateDischarge,
  };
};
