export interface SchemaEvolutionStep {
  fromVersion: number;
  toVersion: number;
  label: string;
  rationale: string;
}

export interface SchemaEvolutionLedgerSummary {
  totalSteps: number;
  firstVersion: number;
  currentVersion: number;
  labels: string[];
}

export const DAILY_RECORD_SCHEMA_LEDGER: readonly SchemaEvolutionStep[] = [
  {
    fromVersion: 0,
    toVersion: 1,
    label: 'v0->v1',
    rationale: 'Promote legacy baseline records to the first governed runtime schema.',
  },
] as const;

export const getSchemaEvolutionLedger = (): readonly SchemaEvolutionStep[] =>
  DAILY_RECORD_SCHEMA_LEDGER;

export const buildSchemaEvolutionLedgerSummary = (): SchemaEvolutionLedgerSummary => ({
  totalSteps: DAILY_RECORD_SCHEMA_LEDGER.length,
  firstVersion: DAILY_RECORD_SCHEMA_LEDGER[0]?.fromVersion ?? 0,
  currentVersion:
    DAILY_RECORD_SCHEMA_LEDGER[DAILY_RECORD_SCHEMA_LEDGER.length - 1]?.toVersion ??
    DAILY_RECORD_SCHEMA_LEDGER[0]?.fromVersion ??
    0,
  labels: DAILY_RECORD_SCHEMA_LEDGER.map(step => step.label),
});
