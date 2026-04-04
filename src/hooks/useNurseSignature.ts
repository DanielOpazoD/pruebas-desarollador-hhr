import { useMemo } from 'react';
import type { DailyRecordStaffingState } from '@/hooks/contracts/dailyRecordHookContracts';
import { resolveShiftNurseSignature } from '@/services/staff/dailyRecordStaffing';

export const useNurseSignature = (record: DailyRecordStaffingState | null) => {
  return useMemo(() => resolveShiftNurseSignature(record, 'night'), [record]);
};

export type UseNurseSignatureReturn = ReturnType<typeof useNurseSignature>;
