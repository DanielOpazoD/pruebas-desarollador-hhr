import type {
  DailyRecordBedsState,
  DailyRecordDateRef,
} from '@/services/contracts/dailyRecordServiceContracts';

export type FhirRecord = DailyRecordBedsState & DailyRecordDateRef;
