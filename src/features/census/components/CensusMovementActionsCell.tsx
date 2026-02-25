import React from 'react';
import type { CensusMovementActionDescriptor } from '@/features/census/types/censusMovementActionTypes';
import { useCensusMovementActionsCellModel } from '@/features/census/hooks/useCensusMovementActionsCellModel';
import { CensusMovementActionButton } from '@/features/census/components/CensusMovementActionButton';

interface CensusMovementActionsCellProps {
  actions: CensusMovementActionDescriptor[];
  children?: React.ReactNode;
}

export const CensusMovementActionsCell: React.FC<CensusMovementActionsCellProps> = ({
  actions,
  children,
}) => {
  const actionViewModels = useCensusMovementActionsCellModel(actions);

  return (
    <td className="p-2 print:hidden align-middle">
      <div className="flex items-center justify-end gap-2 h-full">
        {actionViewModels.map(action => (
          <CensusMovementActionButton key={action.key} action={action} />
        ))}
        {children}
      </div>
    </td>
  );
};
