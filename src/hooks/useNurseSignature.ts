import { useMemo } from 'react';
import type { DailyRecord } from '@/hooks/contracts/dailyRecordHookContracts';
import { resolveShiftNurseSignature } from '@/services/staff/dailyRecordStaffing';

export const useNurseSignature = (record: DailyRecord | null) => {
  return useMemo(() => resolveShiftNurseSignature(record, 'night'), [record]);
};

export type UseNurseSignatureReturn = ReturnType<typeof useNurseSignature>;
