import {
  BACKEND_RUNTIME_CONTRACT_VERSION,
  CLIENT_RUNTIME_CONTRACT_VERSION,
  MIN_SUPPORTED_BACKEND_RUNTIME_CONTRACT_VERSION,
  MIN_SUPPORTED_CLIENT_RUNTIME_CONTRACT_VERSION,
} from '@/constants/runtimeContracts';
import { CURRENT_SCHEMA_VERSION, LEGACY_SCHEMA_VERSION } from '@/constants/version';
import {
  getSchemaGovernanceIntegrity,
  type SchemaGovernanceIntegrity,
} from '@/services/repositories/schemaGovernance';
import {
  buildSchemaEvolutionLedgerSummary,
  type SchemaEvolutionLedgerSummary,
} from '@/services/repositories/migrationLedger';

export interface EndToEndRuntimeContractSnapshot {
  clientRuntimeContractVersion: number;
  backendRuntimeContractVersion: number;
  minSupportedBackendRuntimeContractVersion: number;
  minSupportedClientRuntimeContractVersion: number;
  currentSchemaVersion: number;
  legacySchemaVersion: number;
  backendSupportedSchemaVersion: number;
  backendLegacySchemaFloorVersion: number;
  schemaGovernance: SchemaGovernanceIntegrity;
  schemaEvolution: SchemaEvolutionLedgerSummary;
}

export interface EndToEndRuntimeContractAssessment {
  ok: boolean;
  reason:
    | 'compatible'
    | 'backend_too_old'
    | 'client_too_old_for_backend'
    | 'backend_schema_drift'
    | 'schema_inverted'
    | 'schema_governance_invalid'
    | 'schema_ledger_drift';
  snapshot: EndToEndRuntimeContractSnapshot;
}

export const getEndToEndRuntimeContractSnapshot = (): EndToEndRuntimeContractSnapshot => {
  const schemaGovernance = getSchemaGovernanceIntegrity();
  const schemaEvolution = buildSchemaEvolutionLedgerSummary();

  return {
    clientRuntimeContractVersion: CLIENT_RUNTIME_CONTRACT_VERSION,
    backendRuntimeContractVersion: BACKEND_RUNTIME_CONTRACT_VERSION,
    minSupportedBackendRuntimeContractVersion: MIN_SUPPORTED_BACKEND_RUNTIME_CONTRACT_VERSION,
    minSupportedClientRuntimeContractVersion: MIN_SUPPORTED_CLIENT_RUNTIME_CONTRACT_VERSION,
    currentSchemaVersion: CURRENT_SCHEMA_VERSION,
    legacySchemaVersion: LEGACY_SCHEMA_VERSION,
    backendSupportedSchemaVersion: CURRENT_SCHEMA_VERSION,
    backendLegacySchemaFloorVersion: LEGACY_SCHEMA_VERSION,
    schemaGovernance,
    schemaEvolution,
  };
};

export const assessEndToEndRuntimeContract = (): EndToEndRuntimeContractAssessment => {
  const snapshot = getEndToEndRuntimeContractSnapshot();

  if (snapshot.legacySchemaVersion > snapshot.currentSchemaVersion) {
    return { ok: false, reason: 'schema_inverted', snapshot };
  }

  if (snapshot.backendRuntimeContractVersion < snapshot.minSupportedBackendRuntimeContractVersion) {
    return { ok: false, reason: 'backend_too_old', snapshot };
  }

  if (snapshot.clientRuntimeContractVersion < snapshot.minSupportedClientRuntimeContractVersion) {
    return { ok: false, reason: 'client_too_old_for_backend', snapshot };
  }

  if (
    snapshot.backendSupportedSchemaVersion !== snapshot.currentSchemaVersion ||
    snapshot.backendLegacySchemaFloorVersion !== snapshot.legacySchemaVersion
  ) {
    return { ok: false, reason: 'backend_schema_drift', snapshot };
  }

  if (!snapshot.schemaGovernance.ok) {
    return { ok: false, reason: 'schema_governance_invalid', snapshot };
  }

  if (
    snapshot.schemaEvolution.currentVersion !== snapshot.currentSchemaVersion ||
    snapshot.schemaEvolution.firstVersion !== snapshot.legacySchemaVersion
  ) {
    return { ok: false, reason: 'schema_ledger_drift', snapshot };
  }

  return { ok: true, reason: 'compatible', snapshot };
};
