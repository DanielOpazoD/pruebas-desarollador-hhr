import { DailyRecord } from '@/types';

export type LegacyMigrationRule =
  | 'schema_defaults_applied'
  | 'record_invariants_normalized'
  | 'legacy_nurses_promoted_to_day_shift'
  | 'legacy_single_nurse_promoted'
  | 'legacy_tens_promoted_to_day_shift'
  | 'schema_version_floor_enforced';

export type MigrationCompatibilityIntensity =
  | 'none'
  | 'normalized_only'
  | 'legacy_staff_promoted'
  | 'legacy_schema_bridge';

export interface DailyRecordMigrationResult {
  record: DailyRecord;
  appliedRules: LegacyMigrationRule[];
  compatibilityIntensity: MigrationCompatibilityIntensity;
}
