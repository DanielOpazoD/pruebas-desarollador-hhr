#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const ledgerFile = fs.readFileSync(
  path.join(workspaceRoot, 'src/services/repositories/migrationLedger.ts'),
  'utf8'
);

const stepMatches = [...ledgerFile.matchAll(/fromVersion:\s*(\d+),[\s\S]*?toVersion:\s*(\d+),[\s\S]*?label:\s*'([^']+)'/g)];
const steps = stepMatches.map(match => ({
  fromVersion: Number(match[1]),
  toVersion: Number(match[2]),
  label: match[3],
}));

const reportDir = path.join(workspaceRoot, 'reports');
fs.mkdirSync(reportDir, { recursive: true });

const jsonReport = {
  generatedAt: new Date().toISOString(),
  totalSteps: steps.length,
  firstVersion: steps[0]?.fromVersion ?? 0,
  currentVersion: steps.at(-1)?.toVersion ?? steps[0]?.fromVersion ?? 0,
  steps,
};

fs.writeFileSync(
  path.join(reportDir, 'schema-evolution.json'),
  `${JSON.stringify(jsonReport, null, 2)}\n`,
  'utf8'
);

const markdown = `# Schema Evolution Snapshot

- Generated: ${jsonReport.generatedAt}
- Total steps: ${jsonReport.totalSteps}
- First version: v${jsonReport.firstVersion}
- Current version: v${jsonReport.currentVersion}

| Label | From | To |
| --- | ---: | ---: |
${steps.map(step => `| ${step.label} | ${step.fromVersion} | ${step.toVersion} |`).join('\n')}
`;

fs.writeFileSync(path.join(reportDir, 'schema-evolution.md'), `${markdown}\n`, 'utf8');

console.log('[schema-evolution] Report generated at reports/schema-evolution.{md,json}');
