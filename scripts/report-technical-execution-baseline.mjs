#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'scripts', 'config', 'technical-execution-baseline.json');
const REPORTS_DIR = path.join(ROOT, 'reports');
const JSON_OUTPUT = path.join(REPORTS_DIR, 'technical-execution-baseline.json');
const MD_OUTPUT = path.join(REPORTS_DIR, 'technical-execution-baseline.md');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

const report = {
  generatedAt: new Date().toISOString(),
  version: config.version,
  canonicalSources: Array.isArray(config.canonicalSources) ? config.canonicalSources : [],
  streams: Array.isArray(config.streams) ? config.streams : [],
  backlog: Array.isArray(config.backlog) ? config.backlog : [],
};

const markdown = [
  '# Technical Execution Baseline',
  '',
  `Generated at: ${report.generatedAt}`,
  '',
  '## Canonical Sources',
  '',
  ...report.canonicalSources.map(source => `- \`${source}\``),
  '',
  '## Streams',
  '',
  '| Stream | Goal |',
  '| --- | --- |',
  ...report.streams.map(stream => `| \`${stream.id}\` | ${stream.goal} |`),
  '',
  '## Prioritized Backlog',
  '',
  '| Id | Priority | Stream | Closure signal |',
  '| --- | --- | --- | --- |',
  ...report.backlog.map(
    item =>
      `| \`${item.id}\` | ${item.priority} | \`${item.stream}\` | ${item.closureSignal} |`
  ),
];

fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(MD_OUTPUT, `${markdown.join('\n')}\n`, 'utf8');

console.log(
  '[technical-execution-baseline] Report generated at reports/technical-execution-baseline.{md,json}'
);
