#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { buildCriticalCoverageReport } from './criticalCoverageSupport.mjs';

const root = process.cwd();
const configPath = path.join(root, 'scripts', 'config', 'critical-coverage-thresholds.json');
const report = buildCriticalCoverageReport(root);

if (!report.coverageArtifactPresent) {
  console.error(
    '[critical-coverage] Missing coverage artifact. Run the critical coverage tests before updating the baseline.'
  );
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

for (const zone of report.criticalZones) {
  if (!config.zones?.[zone.root]) {
    continue;
  }

  config.zones[zone.root].coverageBaseline = {
    lines: zone.coverage.lines.pct,
    functions: zone.coverage.functions.pct,
    branches: zone.coverage.branches.pct,
  };
}

fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
console.log('[critical-coverage] Coverage baselines updated.');
