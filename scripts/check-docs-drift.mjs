#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();

const checks = [
  {
    file: 'src/services/repositories/README.md',
    patterns: [
      'legacyRecordBridgeService.ts',
      'legacyBridgeGovernance.ts',
      'reports/legacy-bridge-governance.md',
      'schemaEvolutionPolicy.ts',
      'migrationLedger.ts',
      'runtimeContractGovernance.ts',
      'reports/runtime-contracts.md',
      'dailyRecordAggregate.ts',
      'reports/schema-evolution.md',
      'docs/RUNBOOK_OPERATIONAL_BUDGETS.md',
      'reports/operational-health.md',
    ],
  },
  {
    file: 'src/services/storage/README.md',
    patterns: [
      'sync/syncQueueEngine.ts',
      'firestore/firestoreQuerySupport.ts',
      'firestore/firestoreWriteSupport.ts',
      'storage/sync',
      'docs/RUNBOOK_OPERATIONAL_BUDGETS.md',
      'check:operational-runbooks',
      'reports/operational-health.md',
    ],
  },
];

const fail = message => {
  console.error(`[docs-drift] ${message}`);
  process.exit(1);
};

for (const check of checks) {
  const filePath = path.join(workspaceRoot, check.file);
  const content = fs.readFileSync(filePath, 'utf8');
  const missing = check.patterns.filter(pattern => !content.includes(pattern));
  if (missing.length > 0) {
    fail(`${check.file} is missing references to: ${missing.join(', ')}`);
  }
}

console.log('[docs-drift] OK');
