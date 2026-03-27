#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

import { buildServerlessRuntimeGovernanceSnapshot } from './lib/serverlessRuntimeGovernance.mjs';

const ROOT = process.cwd();
const DOCS = [
  'docs/RUNBOOK_NETLIFY_SERVERLESS_DEPLOY.md',
  'docs/RUNBOOK_AI_PROVIDER_OPERATIONS.md',
  'docs/SERVERLESS_SENSITIVE_CONTRACTS.md',
];

const report = buildServerlessRuntimeGovernanceSnapshot(ROOT);
const issues = [];

if (!report.rootBuildRuntime.aligned) {
  issues.push(
    `Root runtime drift: .nvmrc=${report.rootBuildRuntime.nvmrc}, package.json=${report.rootBuildRuntime.packageEngine}, netlify=${report.rootBuildRuntime.netlifyNodeVersion}`
  );
}

if (!report.firebaseFunctionsRuntime.packageEngine) {
  issues.push('functions/package.json must declare engines.node');
}

for (const doc of DOCS) {
  if (!fs.existsSync(path.join(ROOT, doc))) {
    issues.push(`Missing serverless runbook: ${doc}`);
  }
}

if (issues.length > 0) {
  console.error('[serverless-runtime-governance] Governance gaps found:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(
  `[serverless-runtime-governance] OK (root=${report.rootBuildRuntime.nvmrc}, firebase-functions=${report.firebaseFunctionsRuntime.packageEngine})`
);

