#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const ANY_PATTERN = /:\s*any\b|\bas\s+any\b/g;

const toPosix = value => value.split(path.sep).join('/');

const isSourceFile = filePath => {
  if (!SOURCE_EXTENSIONS.has(path.extname(filePath))) return false;
  if (filePath.endsWith('.d.ts')) return false;
  const relative = toPosix(path.relative(ROOT, filePath));
  return !relative.includes('/tests/') && !relative.includes('.test.') && !relative.includes('.spec.');
};

const walkFiles = dirPath => {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath));
      continue;
    }
    if (entry.isFile() && isSourceFile(absolutePath)) {
      files.push(absolutePath);
    }
  }
  return files;
};

const violations = [];

for (const filePath of walkFiles(SRC_ROOT)) {
  const content = fs.readFileSync(filePath, 'utf8');
  const matches = content.match(ANY_PATTERN) || [];
  if (matches.length > 0) {
    violations.push({ file: toPosix(path.relative(ROOT, filePath)), count: matches.length });
  }
}

if (violations.length > 0) {
  console.error('\nSource explicit-any checks failed (non-test code must be 0):');
  for (const violation of violations.sort((a, b) => b.count - a.count)) {
    console.error(`- ${violation.file}: ${violation.count}`);
  }
  process.exit(1);
}

console.log('Source explicit-any checks passed.');
