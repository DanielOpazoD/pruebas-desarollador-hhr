const {
  BACKEND_RUNTIME_CONTRACT_VERSION,
  MIN_SUPPORTED_CLIENT_RUNTIME_CONTRACT_VERSION,
  SUPPORTED_SCHEMA_VERSION,
  LEGACY_SCHEMA_FLOOR_VERSION,
} = require('../../functions/lib/runtime/runtimeContract');

export const handler = async () => ({
  statusCode: 200,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
  },
  body: JSON.stringify({
    backendRuntimeContractVersion: BACKEND_RUNTIME_CONTRACT_VERSION,
    minSupportedClientRuntimeContractVersion: MIN_SUPPORTED_CLIENT_RUNTIME_CONTRACT_VERSION,
    supportedSchemaVersion: SUPPORTED_SCHEMA_VERSION,
    legacySchemaFloorVersion: LEGACY_SCHEMA_FLOOR_VERSION,
  }),
});
