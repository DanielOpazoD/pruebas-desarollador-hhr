import { useContext } from 'react';

export const useRequiredContextValue = <T>(
  context: React.Context<T | undefined>,
  hookName: string
): T => {
  const value = useContext(context);
  if (value === undefined) {
    throw new Error(`${hookName} must be used within a DailyRecordProvider`);
  }
  return value;
};
