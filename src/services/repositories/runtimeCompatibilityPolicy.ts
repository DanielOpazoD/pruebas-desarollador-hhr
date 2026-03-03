import {
  BACKEND_RUNTIME_CONTRACT_VERSION,
  CLIENT_RUNTIME_CONTRACT_VERSION,
  MIN_SUPPORTED_BACKEND_RUNTIME_CONTRACT_VERSION,
} from '@/constants/runtimeContracts';
import { CURRENT_SCHEMA_VERSION, LEGACY_SCHEMA_VERSION } from '@/constants/version';

export interface RuntimeCompatibilitySnapshot {
  clientRuntimeContractVersion: number;
  backendRuntimeContractVersion: number;
  minSupportedBackendRuntimeContractVersion: number;
  currentSchemaVersion: number;
  legacySchemaVersion: number;
}

export interface RuntimeCompatibilityAssessment {
  ok: boolean;
  reason: 'compatible' | 'backend_too_old' | 'schema_inverted';
  snapshot: RuntimeCompatibilitySnapshot;
}

export const getRuntimeCompatibilitySnapshot = (): RuntimeCompatibilitySnapshot => ({
  clientRuntimeContractVersion: CLIENT_RUNTIME_CONTRACT_VERSION,
  backendRuntimeContractVersion: BACKEND_RUNTIME_CONTRACT_VERSION,
  minSupportedBackendRuntimeContractVersion: MIN_SUPPORTED_BACKEND_RUNTIME_CONTRACT_VERSION,
  currentSchemaVersion: CURRENT_SCHEMA_VERSION,
  legacySchemaVersion: LEGACY_SCHEMA_VERSION,
});

export const assessRuntimeCompatibility = (): RuntimeCompatibilityAssessment => {
  const snapshot = getRuntimeCompatibilitySnapshot();

  if (snapshot.legacySchemaVersion > snapshot.currentSchemaVersion) {
    return {
      ok: false,
      reason: 'schema_inverted',
      snapshot,
    };
  }

  if (snapshot.backendRuntimeContractVersion < snapshot.minSupportedBackendRuntimeContractVersion) {
    return {
      ok: false,
      reason: 'backend_too_old',
      snapshot,
    };
  }

  return {
    ok: true,
    reason: 'compatible',
    snapshot,
  };
};
