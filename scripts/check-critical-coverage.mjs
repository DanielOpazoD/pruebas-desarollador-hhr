#!/usr/bin/env node

import { buildCriticalCoverageReport } from './criticalCoverageSupport.mjs';

const report = buildCriticalCoverageReport(process.cwd());
const failedZones = report.criticalZones.filter(zone => !zone.passed);

if (!report.coverageArtifactPresent) {
  console.error(
    `[critical-coverage] Missing coverage artifact ${report.coverageArtifact}. Run the critical coverage suite first.`
  );
  process.exit(1);
}

if (failedZones.length === 0) {
  console.log('[critical-coverage] OK');
  process.exit(0);
}

console.error('[critical-coverage] Failing zones:');
for (const zone of failedZones) {
  const structuralIssues = zone.structuralGate.failures.join(' ');
  const coverageIssues = zone.coverageGate.failures.join(' ');
  console.error(`- ${zone.root}`);
  if (structuralIssues) {
    console.error(`  structural: ${structuralIssues}`);
  }
  if (coverageIssues) {
    console.error(`  coverage: ${coverageIssues}`);
  }
}

process.exit(1);
