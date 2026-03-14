#!/usr/bin/env node

import { buildCriticalCoverageReport } from './criticalCoverageSupport.mjs';

const report = buildCriticalCoverageReport(process.cwd());
const failedZones = report.criticalZones.filter(zone => !zone.passed);

if (failedZones.length === 0) {
  console.log('[critical-coverage] OK');
  process.exit(0);
}

console.error('[critical-coverage] Failing zones:');
for (const zone of failedZones) {
  console.error(
    `- ${zone.root}: ${zone.testFileCount} test files / ${zone.sourceFileCount} source files (${(zone.testToSourceRatio * 100).toFixed(1)}%), requires at least ${zone.minTestFileCount} tests and ${(zone.minTestToSourceRatio * 100).toFixed(1)}%`
  );
}

process.exit(1);
