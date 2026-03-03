#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const read = relativePath => fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');

const syncQueueServiceContent = read('src/services/storage/syncQueueService.ts');
const systemHealthBudgetContent = read('src/services/admin/systemHealthOperationalBudgets.ts');
const syncDomainPolicyContent = read('src/services/storage/sync/syncDomainPolicy.ts');
const conflictDomainContent = read('src/services/repositories/conflictResolutionDomainPolicy.ts');
const indexedDbCoreContent = read('src/services/storage/indexeddb/indexedDbCore.ts');
const repositoryFiles = [
  'src/services/repositories/dailyRecordRepositoryReadService.ts',
  'src/services/repositories/dailyRecordRepositoryInitializationService.ts',
  'src/services/repositories/dailyRecordRepositorySyncService.ts',
  'src/services/repositories/monthIntegrity.ts',
  'src/services/repositories/legacyRecordBridgeService.ts',
  'src/services/repositories/dailyRecordRemoteLoader.ts',
];

const extractConstNumber = (content, name) => {
  const match = content.match(new RegExp(`const\\s+${name}\\s*=\\s*(\\d+)`, 'm'));
  return match ? Number(match[1]) : null;
};

const extractObjectNumbers = (content, objectName) => {
  const match = content.match(
    new RegExp(`${objectName}(?::[^=]+)?\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`, 'm')
  );
  if (!match) return {};

  return Object.fromEntries(
    [...match[1].matchAll(/([A-Za-z0-9_]+):\s*(\d+)/g)].map(item => [item[1], Number(item[2])])
  );
};

const extractConstArrayNumbers = (content, name) => {
  const match = content.match(new RegExp(`${name}\\s*=\\s*\\[([^\\]]+)\\]`, 'm'));
  if (!match) return [];

  return match[1]
    .split(',')
    .map(part => Number(part.trim()))
    .filter(value => Number.isFinite(value));
};

const extractSyncDomainProfiles = content =>
  [
    ...content.matchAll(
      /id:\s*'([^']+)'\s*,[\s\S]*?retryBudget:\s*(\d+)\s*,[\s\S]*?delayMultiplier:\s*([\d.]+)\s*,[\s\S]*?conflictAction:\s*'([^']+)'/g
    ),
  ].map(match => ({
    id: match[1],
    retryBudget: Number(match[2]),
    delayMultiplier: Number(match[3]),
    conflictAction: match[4],
  }));

const extractConflictRunbookActions = content => {
  const block = content.match(/CONFLICT_CONTEXT_RUNBOOK_ACTIONS:[\s\S]*?=\s*\{([\s\S]*?)\n\}/m);
  if (!block) return {};

  return Object.fromEntries(
    [...block[1].matchAll(/([A-Za-z0-9_]+):\s*'([^']+)'/g)].map(match => [match[1], match[2]])
  );
};

const readJsonReport = relativePath => {
  const filePath = path.join(workspaceRoot, relativePath);
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
};

const collectThresholds = () => {
  const thresholds = [];
  for (const relativePath of repositoryFiles) {
    const content = read(relativePath);
    const matches = [
      ...content.matchAll(
        /measureRepositoryOperation\([\s\S]*?thresholdMs:\s*(\d+)[\s\S]*?(?:context:\s*'([^']+)')?/g
      ),
    ];
    for (const match of matches) {
      thresholds.push({
        file: relativePath,
        thresholdMs: Number(match[1]),
        context: match[2] || null,
      });
    }
  }
  return thresholds;
};

const syncConfig = {
  batchSize: extractConstNumber(syncQueueServiceContent, 'SYNC_QUEUE_BATCH_SIZE'),
  maxRetries: extractConstNumber(syncQueueServiceContent, 'MAX_RETRIES'),
  baseRetryDelayMs: extractConstNumber(syncQueueServiceContent, 'BASE_RETRY_DELAY_MS'),
  maxRetryDelayMs: extractConstNumber(syncQueueServiceContent, 'MAX_RETRY_DELAY_MS'),
};

const versionContent = read('src/constants/version.ts');
const currentVersionMatch = versionContent.match(/CURRENT_SCHEMA_VERSION\s*=\s*(\d+)/);
const legacyVersionMatch = versionContent.match(/LEGACY_SCHEMA_VERSION\s*=\s*(\d+)/);
const thresholds = collectThresholds();
const systemHealthBudgets = extractObjectNumbers(
  systemHealthBudgetContent,
  'DEFAULT_SYSTEM_HEALTH_THRESHOLDS'
);
const syncDomainProfiles = extractSyncDomainProfiles(syncDomainPolicyContent);
const conflictContexts = extractConflictRunbookActions(conflictDomainContent);
const legacyBridgeReport = readJsonReport('reports/legacy-bridge-governance.json');
const prolongedOfflineUserAgeMs = extractConstNumber(
  systemHealthBudgetContent,
  'PROLONGED_OFFLINE_USER_AGE_MS'
);
const localPersistence = {
  openTimeoutMs: extractConstNumber(indexedDbCoreContent, 'INDEXED_DB_OPEN_TIMEOUT_MS'),
  deleteTimeoutMs: extractConstNumber(indexedDbCoreContent, 'INDEXED_DB_DELETE_TIMEOUT_MS'),
  maxBackgroundRecoveryAttempts: extractConstNumber(
    indexedDbCoreContent,
    'MAX_BACKGROUND_RECOVERY_ATTEMPTS'
  ),
  recoveryRetryDelaysMs: extractConstArrayNumbers(
    indexedDbCoreContent,
    'INDEXED_DB_RECOVERY_RETRY_DELAYS_MS'
  ),
};
const runbooks = [
  'docs/RUNBOOK_SYNC_RESILIENCE.md',
  'docs/RUNBOOK_SUPPORT_OPERATIONS.md',
  'docs/RUNBOOK_OPERATIONAL_BUDGETS.md',
];

const summary = {
  generatedAt: new Date().toISOString(),
  schema: {
    current: currentVersionMatch ? Number(currentVersionMatch[1]) : null,
    legacy: legacyVersionMatch ? Number(legacyVersionMatch[1]) : null,
  },
  syncQueue: syncConfig,
  systemHealth: {
    ...systemHealthBudgets,
    prolongedOfflineUserAgeMs,
  },
  syncDomainProfiles,
  conflictContexts,
  legacyBridge: legacyBridgeReport,
  localPersistence,
  repositoryPerformance: {
    monitoredOperations: thresholds.length,
    maxThresholdMs: thresholds.reduce((max, item) => Math.max(max, item.thresholdMs), 0),
    minThresholdMs:
      thresholds.length > 0
        ? thresholds.reduce((min, item) => Math.min(min, item.thresholdMs), thresholds[0].thresholdMs)
        : 0,
    thresholds,
  },
  runbooks,
};

const reportDir = path.join(workspaceRoot, 'reports');
fs.mkdirSync(reportDir, { recursive: true });

fs.writeFileSync(
  path.join(reportDir, 'operational-health.json'),
  `${JSON.stringify(summary, null, 2)}\n`,
  'utf8'
);

const markdown = `# Operational Health Snapshot

- Generated: ${summary.generatedAt}
- Schema current: v${summary.schema.current ?? 'unknown'}
- Schema legacy: v${summary.schema.legacy ?? 'unknown'}

## Sync Queue

- Batch size: ${summary.syncQueue.batchSize ?? 'unknown'}
- Max retries: ${summary.syncQueue.maxRetries ?? 'unknown'}
- Base retry delay (ms): ${summary.syncQueue.baseRetryDelayMs ?? 'unknown'}
- Max retry delay (ms): ${summary.syncQueue.maxRetryDelayMs ?? 'unknown'}

## System Health Budgets

- Warning queue age (ms): ${summary.systemHealth.warningOldestPendingAgeMs ?? 'unknown'}
- Critical queue age (ms): ${summary.systemHealth.criticalOldestPendingAgeMs ?? 'unknown'}
- Warning retrying tasks: ${summary.systemHealth.warningRetryingSyncTasks ?? 'unknown'}
- Critical retrying tasks: ${summary.systemHealth.criticalRetryingSyncTasks ?? 'unknown'}
- Warning slow repository op (ms): ${summary.systemHealth.warningSlowRepositoryOperationMs ?? 'unknown'}
- Critical slow repository op (ms): ${summary.systemHealth.criticalSlowRepositoryOperationMs ?? 'unknown'}
- Prolonged offline user age (ms): ${summary.systemHealth.prolongedOfflineUserAgeMs ?? 'unknown'}

## Sync Domain Recovery Profiles

| Profile | Retry budget | Delay multiplier | Conflict action |
| --- | ---: | ---: | --- |
${summary.syncDomainProfiles
  .map(
    profile =>
      `| \`${profile.id}\` | ${profile.retryBudget} | ${profile.delayMultiplier} | ${profile.conflictAction} |`
  )
  .join('\n')}

## Conflict Context Runbook Actions

| Context | Action |
| --- | --- |
${Object.entries(summary.conflictContexts)
  .map(([context, action]) => `| \`${context}\` | ${action} |`)
  .join('\n')}

## Legacy Bridge Governance

- Policy version: ${summary.legacyBridge?.policyVersion ?? 'unknown'}
- Allowed modes: ${
  Array.isArray(summary.legacyBridge?.allowedModes)
    ? summary.legacyBridge.allowedModes.join(', ')
    : 'unknown'
}
- Hot path policy: ${summary.legacyBridge?.hotPathPolicy ?? 'unknown'}

## Local Persistence Recovery Budgets

- IndexedDB open timeout (ms): ${summary.localPersistence.openTimeoutMs ?? 'unknown'}
- IndexedDB delete timeout (ms): ${summary.localPersistence.deleteTimeoutMs ?? 'unknown'}
- Max background recovery attempts: ${summary.localPersistence.maxBackgroundRecoveryAttempts ?? 'unknown'}
- Recovery retry delays (ms): ${
  summary.localPersistence.recoveryRetryDelaysMs.length > 0
    ? summary.localPersistence.recoveryRetryDelaysMs.join(', ')
    : 'unknown'
}

## Repository Performance Thresholds

- Monitored operations: ${summary.repositoryPerformance.monitoredOperations}
- Min threshold (ms): ${summary.repositoryPerformance.minThresholdMs}
- Max threshold (ms): ${summary.repositoryPerformance.maxThresholdMs}

| File | Threshold (ms) | Context |
| --- | ---: | --- |
${summary.repositoryPerformance.thresholds
  .map(item => `| \`${item.file}\` | ${item.thresholdMs} | ${item.context ?? '-'} |`)
  .join('\n')}

## Runbooks

${summary.runbooks.map(runbook => `- \`${runbook}\``).join('\n')}
`;

fs.writeFileSync(path.join(reportDir, 'operational-health.md'), `${markdown}\n`, 'utf8');

console.log('[operational-health] Report generated at reports/operational-health.{md,json}');
