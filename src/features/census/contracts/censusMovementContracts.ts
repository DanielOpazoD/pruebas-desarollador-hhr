/**
 * Census-owned facade over movement contracts.
 *
 * Census consumers should prefer this module over the root movement types so
 * feature-level APIs can evolve behind a narrower import surface.
 */
export type {
  CMAData,
  DischargeData,
  DischargeType,
  IeehData,
  TransferData,
} from '@/types/domain/movements';
