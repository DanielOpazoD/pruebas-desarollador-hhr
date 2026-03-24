import { resolveMovementSectionState } from '../controllers/censusMovementSectionController';
import type { ControllerConfirmDescriptor } from '@/shared/contracts/controllers/confirmDescriptor';
import { useMovementSectionActions } from './useMovementSectionActions';

interface UseMovementSectionRuntimeParams<TItem> {
  items: TItem[] | null | undefined;
  undoDialog: ControllerConfirmDescriptor;
  undoErrorTitle: string;
  onUndo: (id: string) => void | Promise<void>;
  deleteDialog: ControllerConfirmDescriptor;
  deleteErrorTitle: string;
  onDelete: (id: string) => void | Promise<void>;
}

export const useMovementSectionRuntime = <TItem>({
  items,
  undoDialog,
  undoErrorTitle,
  onUndo,
  deleteDialog,
  deleteErrorTitle,
  onDelete,
}: UseMovementSectionRuntimeParams<TItem>) => {
  const sectionState = resolveMovementSectionState(items);
  const actions = useMovementSectionActions({
    undoDialog,
    undoErrorTitle,
    onUndo,
    deleteDialog,
    deleteErrorTitle,
    onDelete,
  });

  return {
    ...sectionState,
    ...actions,
  };
};
