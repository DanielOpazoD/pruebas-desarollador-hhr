#!/usr/bin/env node

import { buildReleaseReadinessScorecard } from './releaseReadinessScorecardSupport.mjs';

const report = buildReleaseReadinessScorecard(process.cwd());

if (report.issues.length > 0) {
  console.error('[release-readiness-scorecard] Scorecard is degraded:');
  for (const issue of report.issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`[release-readiness-scorecard] OK (${report.indicators.length} indicators)`);
