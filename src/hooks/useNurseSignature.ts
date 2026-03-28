import { useMemo } from 'react';
import type { DailyRecordStaffingState } from '@/types/domain/dailyRecordSlices';
import { resolveShiftNurseSignature } from '@/services/staff/dailyRecordStaffing';

export const useNurseSignature = (record: DailyRecordStaffingState | null) => {
  return useMemo(() => resolveShiftNurseSignature(record, 'night'), [record]);
};

export type UseNurseSignatureReturn = ReturnType<typeof useNurseSignature>;
