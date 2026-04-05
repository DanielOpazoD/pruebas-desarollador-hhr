import { createContext, useContext } from 'react';
import type { DailyRecordActionsContextType } from '@/context/dailyRecordContextContracts';

export const DailyRecordActionsContext = createContext<DailyRecordActionsContextType | undefined>(
  undefined
);

export const useRequiredDailyRecordActionsContext = (
  hookName: string
): DailyRecordActionsContextType => {
  const context = useContext(DailyRecordActionsContext);
  if (context === undefined) {
    throw new Error(`${hookName} must be used within a DailyRecordProvider`);
  }
  return context;
};
