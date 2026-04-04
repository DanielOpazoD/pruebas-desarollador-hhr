/**
 * Census-owned facade over bed contracts.
 *
 * Census code should import bed contracts from here so the feature can narrow
 * or reshape the shared bed model without widening direct dependencies on the
 * root domain hotspot.
 */
export type { BedDefinition } from '@/types/domain/beds';
export { BedType } from '@/types/domain/beds';
