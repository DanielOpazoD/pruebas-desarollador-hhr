#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();

const runtimeConstants = fs.readFileSync(
  path.join(workspaceRoot, 'src/constants/runtimeContracts.ts'),
  'utf8'
);
const versionConstants = fs.readFileSync(
  path.join(workspaceRoot, 'src/constants/version.ts'),
  'utf8'
);
const backendRuntimeContent = fs.readFileSync(
  path.join(workspaceRoot, 'functions/lib/runtime/runtimeContract.js'),
  'utf8'
);
const migrationLedgerContent = fs.readFileSync(
  path.join(workspaceRoot, 'src/services/repositories/migrationLedger.ts'),
  'utf8'
);

const parseConstant = (content, name) => {
  const match = content.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
  return match ? Number(match[1]) : null;
};

const stepMatches = [
  ...migrationLedgerContent.matchAll(
    /fromVersion:\s*(\d+),[\s\S]*?toVersion:\s*(\d+),[\s\S]*?label:\s*'([^']+)'/g
  ),
];
const steps = stepMatches.map(match => ({
  fromVersion: Number(match[1]),
  toVersion: Number(match[2]),
  label: match[3],
}));

const report = {
  generatedAt: new Date().toISOString(),
  clientRuntimeContractVersion: parseConstant(runtimeConstants, 'CLIENT_RUNTIME_CONTRACT_VERSION'),
  backendRuntimeContractVersion: parseConstant(runtimeConstants, 'BACKEND_RUNTIME_CONTRACT_VERSION'),
  minSupportedBackendRuntimeContractVersion: parseConstant(
    runtimeConstants,
    'MIN_SUPPORTED_BACKEND_RUNTIME_CONTRACT_VERSION'
  ),
  minSupportedClientRuntimeContractVersion: parseConstant(
    runtimeConstants,
    'MIN_SUPPORTED_CLIENT_RUNTIME_CONTRACT_VERSION'
  ),
  currentSchemaVersion: parseConstant(versionConstants, 'CURRENT_SCHEMA_VERSION'),
  legacySchemaVersion: parseConstant(versionConstants, 'LEGACY_SCHEMA_VERSION'),
  backendSupportedSchemaVersion: parseConstant(
    backendRuntimeContent,
    'SUPPORTED_SCHEMA_VERSION'
  ),
  backendLegacySchemaFloorVersion: parseConstant(
    backendRuntimeContent,
    'LEGACY_SCHEMA_FLOOR_VERSION'
  ),
  schemaEvolutionSteps: steps,
};

const reportDir = path.join(workspaceRoot, 'reports');
fs.mkdirSync(reportDir, { recursive: true });

fs.writeFileSync(
  path.join(reportDir, 'runtime-contracts.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8'
);

const markdown = `# Runtime Contracts Snapshot

- Generated: ${report.generatedAt}
- Client runtime contract: v${report.clientRuntimeContractVersion}
- Backend runtime contract: v${report.backendRuntimeContractVersion}
- Min supported backend runtime: v${report.minSupportedBackendRuntimeContractVersion}
- Min supported client runtime: v${report.minSupportedClientRuntimeContractVersion}
- Current schema: v${report.currentSchemaVersion}
- Legacy schema: v${report.legacySchemaVersion}
- Backend supported schema: v${report.backendSupportedSchemaVersion}
- Backend legacy floor: v${report.backendLegacySchemaFloorVersion}

## Schema Evolution Steps

| Label | From | To |
| --- | ---: | ---: |
${report.schemaEvolutionSteps.map(step => `| ${step.label} | ${step.fromVersion} | ${step.toVersion} |`).join('\n')}
`;

fs.writeFileSync(path.join(reportDir, 'runtime-contracts.md'), `${markdown}\n`, 'utf8');

console.log('[runtime-contracts] Report generated at reports/runtime-contracts.{md,json}');
