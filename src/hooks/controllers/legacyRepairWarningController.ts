export interface LegacyRepairSignal {
  compatibilityIntensity?: string | null;
  migrationRulesApplied?: string[] | null;
  sourceCompatibilityIntensity?: string | null;
  sourceMigrationRulesApplied?: string[] | null;
}

const CRITICAL_REPAIR_RULES = new Set(['salvage_patient_fallback_applied']);

const hasCriticalRepairRules = (rules: string[] | null | undefined): boolean =>
  (rules || []).some(rule => CRITICAL_REPAIR_RULES.has(rule));

export const hasCriticalLegacyRepairSignal = (
  signal: LegacyRepairSignal | null | undefined
): boolean =>
  Boolean(
    signal &&
    ((signal.compatibilityIntensity &&
      signal.compatibilityIntensity !== 'none' &&
      hasCriticalRepairRules(signal.migrationRulesApplied)) ||
      (signal.sourceCompatibilityIntensity &&
        signal.sourceCompatibilityIntensity !== 'none' &&
        hasCriticalRepairRules(signal.sourceMigrationRulesApplied)))
  );

export const getLegacyRepairWarningMessage = (
  context: 'copy_day' | 'import_backup' | 'copy_patient'
) => {
  if (context === 'import_backup') {
    return 'Se importó correctamente, pero se repararon datos antiguos incompatibles.';
  }
  if (context === 'copy_patient') {
    return 'La copia se realizó correctamente, pero se repararon datos antiguos del paciente.';
  }
  return 'La copia se realizó correctamente, pero se repararon datos antiguos incompatibles.';
};
