import { useEffect, useState } from 'react';
import type { TransferRequest } from '@/types/transfers';
import { subscribeToTransfers } from '@/services/transfers/transferService';
import { useAuthState } from '@/hooks/useAuthState';

interface UseTransferSubscriptionsResult {
  transfers: TransferRequest[];
  isLoading: boolean;
  error: string | null;
}

export const useTransferSubscriptions = (): UseTransferSubscriptionsResult => {
  const { remoteSyncStatus } = useAuthState();
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [isLoading, setIsLoading] = useState(remoteSyncStatus === 'bootstrapping');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (remoteSyncStatus === 'bootstrapping') {
      setIsLoading(true);
      return;
    }

    if (remoteSyncStatus !== 'ready') {
      setIsLoading(false);
      return;
    }

    setError(null);
    setIsLoading(true);
    const unsubscribe = subscribeToTransfers(
      data => {
        setTransfers(data);
        setIsLoading(false);
      },
      {
        onError: message => {
          setError(message);
          setIsLoading(false);
        },
      }
    );

    return () => unsubscribe();
  }, [remoteSyncStatus]);

  return {
    transfers,
    isLoading,
    error,
  };
};
