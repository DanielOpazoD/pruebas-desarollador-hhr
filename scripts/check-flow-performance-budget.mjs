#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const reportPath = path.join(root, 'reports', 'e2e', 'flow-performance-budget.json');
const enforceTargets =
  process.argv.includes('--enforce-targets') || process.env.FLOW_PERF_ENFORCE_TARGETS === '1';

const fail = message => {
  console.error(`[flow-performance-budget] ${message}`);
  process.exit(1);
};

if (!fs.existsSync(reportPath)) {
  fail('Missing reports/e2e/flow-performance-budget.json. Run the Playwright flow budget spec first.');
}

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
const requiredFlows = [
  'loginVisibleMs',
  'authFeedbackMs',
  'censoVisibleMs',
  'censoRecordReadyMs',
  'backupFilesVisibleMs',
];

if (!report || typeof report !== 'object') {
  fail('Invalid JSON payload.');
}

if (!report.metrics || typeof report.metrics !== 'object') {
  fail('Report is missing metrics.');
}

const missingFlows = requiredFlows.filter(flow => typeof report.metrics[flow] !== 'number');
if (missingFlows.length > 0) {
  fail(`Report is missing metrics for: ${missingFlows.join(', ')}`);
}

console.log('[flow-performance-budget] Report found.');
for (const flow of requiredFlows) {
  const metric = report.metrics[flow];
  const budget = report.budgets?.[flow];
  const enforced = budget?.enforcedMaxMs ?? 'unknown';
  const target = budget?.targetMs ?? 'unknown';
  console.log(
    `[flow-performance-budget] ${flow}: ${metric}ms (enforced=${enforced}, target=${target})`
  );
}

const targetViolations = Array.isArray(report.targetViolations) ? report.targetViolations : [];
if (targetViolations.length > 0) {
  console.warn('[flow-performance-budget] Target violations:');
  for (const violation of targetViolations) {
    console.warn(
      `  - ${violation.flow}: ${violation.actualMs}ms exceeds target ${violation.targetMs}ms`
    );
  }

  if (enforceTargets) {
    fail('Target violations detected with --enforce-targets.');
  }
}

console.log('[flow-performance-budget] OK');
