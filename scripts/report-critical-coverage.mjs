#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  buildCriticalCoverageReport,
  formatCriticalCoverageMarkdown,
} from './criticalCoverageSupport.mjs';

const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, 'reports');
const JSON_OUTPUT = path.join(REPORTS_DIR, 'critical-coverage.json');
const MD_OUTPUT = path.join(REPORTS_DIR, 'critical-coverage.md');

const report = buildCriticalCoverageReport(ROOT);

fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(MD_OUTPUT, `${formatCriticalCoverageMarkdown(report)}\n`, 'utf8');

console.log('[critical-coverage] Report generated at reports/critical-coverage.{md,json}');
