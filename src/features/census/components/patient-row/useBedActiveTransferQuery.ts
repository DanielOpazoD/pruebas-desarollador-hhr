import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryClient';
import { getLatestOpenTransferRequestByPatientRut } from '@/services/transfers/transferService';

export const usePatientActiveTransferQuery = (
  patientRut: string | null | undefined,
  enabled: boolean
) =>
  useQuery({
    queryKey: queryKeys.transfers.activeByPatientRut(patientRut || ''),
    queryFn: async () => getLatestOpenTransferRequestByPatientRut(patientRut || ''),
    enabled: enabled && Boolean(patientRut),
    staleTime: 60 * 1000,
  });
