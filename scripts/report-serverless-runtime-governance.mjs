#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import { buildServerlessRuntimeGovernanceSnapshot } from './lib/serverlessRuntimeGovernance.mjs';

const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, 'reports');
const report = buildServerlessRuntimeGovernanceSnapshot(ROOT);

const formatEngineTable = entries => {
  if (!entries.length) {
    return '_No direct dependencies with engine constraints._';
  }

  return [
    '| Package | Section | Version | Node | npm |',
    '| --- | --- | --- | --- | --- |',
    ...entries.map(
      entry =>
        `| ${entry.name} | ${entry.section} | ${entry.installedVersion || entry.declaredRange} | ${entry.node || '—'} | ${entry.npm || '—'} |`
    ),
  ].join('\n');
};

const markdown = `# Serverless Runtime Governance

- Generated: ${report.generatedAt}
- Root build runtime aligned: ${report.rootBuildRuntime.aligned ? 'yes' : 'no'}
- Root build Node (\`.nvmrc\`): ${report.rootBuildRuntime.nvmrc}
- Root package engine: ${report.rootBuildRuntime.packageEngine || 'missing'}
- Netlify build Node: ${report.rootBuildRuntime.netlifyNodeVersion || 'missing'}
- Firebase Functions engine: ${report.firebaseFunctionsRuntime.packageEngine || 'missing'}

## Root Direct Dependency Engines

${formatEngineTable(report.directDependencyEngines.root)}

## Firebase Functions Dependency Engines

${formatEngineTable(report.directDependencyEngines.firebaseFunctions)}
`;

fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(
  path.join(REPORTS_DIR, 'serverless-runtime-governance.json'),
  `${JSON.stringify(report, null, 2)}\n`,
  'utf8'
);
fs.writeFileSync(
  path.join(REPORTS_DIR, 'serverless-runtime-governance.md'),
  `${markdown}\n`,
  'utf8'
);

console.log(
  '[serverless-runtime-governance] Report generated at reports/serverless-runtime-governance.{md,json}'
);
