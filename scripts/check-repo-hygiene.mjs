#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const trackedFiles = execSync('git ls-files -z', { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const forbiddenPatterns = [
  {
    id: 'macos-metadata',
    description: 'macOS metadata files must not be tracked.',
    match: file => path.basename(file) === '.DS_Store',
  },
  {
    id: 'office-temp',
    description: 'Office temporary files must not be tracked.',
    match: file => /(^|\/)~\$[^/]+$/.test(file),
  },
  {
    id: 'empty-file',
    description: 'Unexpected empty files must not be tracked.',
    match: file => {
      const absolutePath = path.join(root, file);
      if (!fs.existsSync(absolutePath)) return false;
      const stat = fs.statSync(absolutePath);
      return stat.isFile() && stat.size === 0;
    },
  },
];

const failures = [];

for (const file of trackedFiles) {
  const absolutePath = path.join(root, file);
  if (!fs.existsSync(absolutePath)) continue;

  for (const rule of forbiddenPatterns) {
    if (rule.match(file)) {
      failures.push({ file, rule });
    }
  }
}

if (failures.length > 0) {
  console.error('\nRepository hygiene checks failed:\n');
  for (const failure of failures) {
    console.error(`- [${failure.rule.id}] ${failure.rule.description} (${failure.file})`);
  }
  process.exit(1);
}

console.log('Repository hygiene checks passed.');
