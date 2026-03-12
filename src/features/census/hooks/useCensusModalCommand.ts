import { useCallback } from 'react';

import { useLatestRef } from '@/hooks/useLatestRef';
import { useSingleFlightAsyncCommand } from '@/features/census/hooks/useSingleFlightAsyncCommand';

export const useCensusModalCommand = <TInput>(
  run: (data?: TInput) => Promise<void>
): ((data?: TInput) => void) => {
  const { runSingleFlight } = useSingleFlightAsyncCommand();
  const runRef = useLatestRef(run);

  return useCallback(
    (data?: TInput) => {
      const started = runSingleFlight(async () => {
        await runRef.current(data);
      });

      if (!started) return;
    },
    [runRef, runSingleFlight]
  );
};
