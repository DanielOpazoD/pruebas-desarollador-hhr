/**
 * Data Migration Service
 * Handles migration of legacy data formats to current schema.
 *
 * Clinical Justification: Ensures that clinical data recorded in older versions
 * of the app remains consistent and usable for audits, even as data structures evolve.
 * Prevents "silent corruption" of historical patient records.
 */

import { DailyRecord } from '@/types';
import { parseDailyRecordWithDefaults } from '@/schemas/zodSchemas';
import { normalizeDailyRecordInvariants } from '@/utils/recordInvariants';
import {
  DailyRecordMigrationResult,
  LegacyMigrationRule,
  MigrationCompatibilityIntensity,
} from '@/services/repositories/dataMigrationContracts';

type LegacyDailyRecordShape = DailyRecord & {
  nurseName?: string;
  tens?: string[];
};

const pushRule = (appliedRules: LegacyMigrationRule[], rule: LegacyMigrationRule): void => {
  if (!appliedRules.includes(rule)) {
    appliedRules.push(rule);
  }
};

const migrateLegacyNurses = (
  record: LegacyDailyRecordShape,
  migrated: DailyRecord,
  appliedRules: LegacyMigrationRule[]
): void => {
  if (migrated.nurses && migrated.nurses.length > 0) {
    const hasNurses = migrated.nurses.some(n => !!n);
    const isDayShiftEmpty = !migrated.nursesDayShift || migrated.nursesDayShift.every(n => !n);

    if (hasNurses && isDayShiftEmpty) {
      migrated.nursesDayShift = [...migrated.nurses];
      pushRule(appliedRules, 'legacy_nurses_promoted_to_day_shift');
    }
  }

  if (migrated.nurseName && (!migrated.nursesDayShift || !migrated.nursesDayShift[0])) {
    if (!migrated.nursesDayShift) migrated.nursesDayShift = ['', ''];
    migrated.nursesDayShift[0] = migrated.nurseName;
    pushRule(appliedRules, 'legacy_single_nurse_promoted');
  }
};

const migrateLegacyTens = (
  record: LegacyDailyRecordShape,
  migrated: DailyRecord,
  appliedRules: LegacyMigrationRule[]
): void => {
  const rawTens = record.tens;
  if (!Array.isArray(rawTens) || rawTens.length === 0) return;

  const hasTens = rawTens.some(t => !!t);
  const isDayTensEmpty = !migrated.tensDayShift || migrated.tensDayShift.every(t => !t);
  if (!hasTens || !isDayTensEmpty) return;

  const paddedTens = [...rawTens];
  while (paddedTens.length < 3) paddedTens.push('');
  migrated.tensDayShift = paddedTens.slice(0, 3);
  pushRule(appliedRules, 'legacy_tens_promoted_to_day_shift');
};

const enforceSchemaVersionFloor = (
  migrated: DailyRecord,
  appliedRules: LegacyMigrationRule[]
): void => {
  const previousVersion = migrated.schemaVersion || 0;
  migrated.schemaVersion = Math.max(previousVersion, 1);
  if (migrated.schemaVersion !== previousVersion) {
    pushRule(appliedRules, 'schema_version_floor_enforced');
  }
};

const classifyCompatibilityIntensity = (
  appliedRules: LegacyMigrationRule[]
): MigrationCompatibilityIntensity => {
  const hasLegacyStaffPromotion = appliedRules.some(
    rule =>
      rule === 'legacy_nurses_promoted_to_day_shift' ||
      rule === 'legacy_single_nurse_promoted' ||
      rule === 'legacy_tens_promoted_to_day_shift'
  );

  if (appliedRules.includes('schema_version_floor_enforced')) {
    return hasLegacyStaffPromotion ? 'legacy_schema_bridge' : 'legacy_schema_bridge';
  }

  if (hasLegacyStaffPromotion) {
    return 'legacy_staff_promoted';
  }

  if (
    appliedRules.includes('schema_defaults_applied') ||
    appliedRules.includes('record_invariants_normalized')
  ) {
    return 'normalized_only';
  }

  return 'none';
};

/**
 * Migrates legacy data formats to the current schema using Zod for robust validation.
 *
 * @param record - The record to migrate (potentially in legacy format)
 * @param date - The date string for the record
 * @returns Fully migrated and validated DailyRecord
 */
export const migrateLegacyDataWithReport = (
  record: DailyRecord,
  date: string
): DailyRecordMigrationResult => {
  const normalizedRecord = record as LegacyDailyRecordShape;
  const appliedRules: LegacyMigrationRule[] = [];

  // 1. Initial pass through Zod to apply defaults and recover basic structure
  let migrated = parseDailyRecordWithDefaults(normalizedRecord, date);
  pushRule(appliedRules, 'schema_defaults_applied');

  // 2. Apply invariants so the current runtime never sees sparse bed maps.
  migrated = normalizeDailyRecordInvariants(migrated).record;
  pushRule(appliedRules, 'record_invariants_normalized');

  // 3. Apply explicit legacy compatibility rules that are still supported.
  migrateLegacyNurses(normalizedRecord, migrated, appliedRules);
  migrateLegacyTens(normalizedRecord, migrated, appliedRules);
  enforceSchemaVersionFloor(migrated, appliedRules);

  return {
    record: migrated,
    appliedRules,
    compatibilityIntensity: classifyCompatibilityIntensity(appliedRules),
  };
};

export const migrateLegacyData = (record: DailyRecord, date: string): DailyRecord =>
  migrateLegacyDataWithReport(record, date).record;
