/**
 * Storage-owned facade over daily record contracts.
 *
 * Storage adapters should depend on this module instead of the root domain
 * record shape so persistence internals can evolve behind a narrower surface.
 */
export type {
  DailyRecord,
  DailyRecordPatch,
} from '@/services/contracts/dailyRecordServiceContracts';
