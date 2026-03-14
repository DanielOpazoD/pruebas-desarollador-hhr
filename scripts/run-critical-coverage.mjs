#!/usr/bin/env node

import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getCriticalCoverageTestTargets } from './criticalCoverageSupport.mjs';

const root = process.cwd();
const vitestEntry = path.join(root, 'node_modules', 'vitest', 'vitest.mjs');
const targets = getCriticalCoverageTestTargets(root);

if (targets.length === 0) {
  console.error('[critical-coverage] No critical coverage test targets were configured.');
  process.exit(1);
}

const result = spawnSync(
  process.execPath,
  [vitestEntry, 'run', '-c', 'vitest.critical-coverage.config.ts', ...targets],
  {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  }
);

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
