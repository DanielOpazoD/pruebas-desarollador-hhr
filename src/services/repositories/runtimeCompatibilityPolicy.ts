import {
  BACKEND_RUNTIME_CONTRACT_VERSION,
  CLIENT_RUNTIME_CONTRACT_VERSION,
  MIN_SUPPORTED_BACKEND_RUNTIME_CONTRACT_VERSION,
  MIN_SUPPORTED_CLIENT_RUNTIME_CONTRACT_VERSION,
} from '@/constants/runtimeContracts';
import { CURRENT_SCHEMA_VERSION, LEGACY_SCHEMA_VERSION } from '@/constants/version';
import { assessEndToEndRuntimeContract } from '@/services/repositories/runtimeContractGovernance';

export interface RuntimeCompatibilitySnapshot {
  clientRuntimeContractVersion: number;
  backendRuntimeContractVersion: number;
  minSupportedBackendRuntimeContractVersion: number;
  minSupportedClientRuntimeContractVersion: number;
  currentSchemaVersion: number;
  legacySchemaVersion: number;
}

export interface RuntimeCompatibilityAssessment {
  ok: boolean;
  reason:
    | 'compatible'
    | 'backend_too_old'
    | 'client_too_old_for_backend'
    | 'schema_inverted'
    | 'backend_schema_drift'
    | 'schema_governance_invalid'
    | 'schema_ledger_drift';
  snapshot: RuntimeCompatibilitySnapshot;
}

export const getRuntimeCompatibilitySnapshot = (): RuntimeCompatibilitySnapshot => ({
  clientRuntimeContractVersion: CLIENT_RUNTIME_CONTRACT_VERSION,
  backendRuntimeContractVersion: BACKEND_RUNTIME_CONTRACT_VERSION,
  minSupportedBackendRuntimeContractVersion: MIN_SUPPORTED_BACKEND_RUNTIME_CONTRACT_VERSION,
  minSupportedClientRuntimeContractVersion: MIN_SUPPORTED_CLIENT_RUNTIME_CONTRACT_VERSION,
  currentSchemaVersion: CURRENT_SCHEMA_VERSION,
  legacySchemaVersion: LEGACY_SCHEMA_VERSION,
});

export const assessRuntimeCompatibility = (): RuntimeCompatibilityAssessment => {
  const assessment = assessEndToEndRuntimeContract();
  return {
    ok: assessment.ok,
    reason: assessment.reason,
    snapshot: getRuntimeCompatibilitySnapshot(),
  };
};
