import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryClient';
import { getLatestOpenTransferRequestByBedId } from '@/services/transfers/transferService';

export const useBedActiveTransferQuery = (bedId: string, enabled: boolean) =>
  useQuery({
    queryKey: queryKeys.transfers.activeByBed(bedId),
    queryFn: async () => getLatestOpenTransferRequestByBedId(bedId),
    enabled,
    staleTime: 60 * 1000,
  });
