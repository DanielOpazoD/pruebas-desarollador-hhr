#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const read = relativePath => fs.readFileSync(path.join(workspaceRoot, relativePath), 'utf8');

const syncQueueServiceContent = read('src/services/storage/syncQueueService.ts');
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

const summary = {
  generatedAt: new Date().toISOString(),
  schema: {
    current: currentVersionMatch ? Number(currentVersionMatch[1]) : null,
    legacy: legacyVersionMatch ? Number(legacyVersionMatch[1]) : null,
  },
  syncQueue: syncConfig,
  repositoryPerformance: {
    monitoredOperations: thresholds.length,
    maxThresholdMs: thresholds.reduce((max, item) => Math.max(max, item.thresholdMs), 0),
    minThresholdMs:
      thresholds.length > 0
        ? thresholds.reduce((min, item) => Math.min(min, item.thresholdMs), thresholds[0].thresholdMs)
        : 0,
    thresholds,
  },
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

## Repository Performance Thresholds

- Monitored operations: ${summary.repositoryPerformance.monitoredOperations}
- Min threshold (ms): ${summary.repositoryPerformance.minThresholdMs}
- Max threshold (ms): ${summary.repositoryPerformance.maxThresholdMs}

| File | Threshold (ms) | Context |
| --- | ---: | --- |
${summary.repositoryPerformance.thresholds
  .map(item => `| \`${item.file}\` | ${item.thresholdMs} | ${item.context ?? '-'} |`)
  .join('\n')}
`;

fs.writeFileSync(path.join(reportDir, 'operational-health.md'), `${markdown}\n`, 'utf8');

console.log('[operational-health] Report generated at reports/operational-health.{md,json}');
