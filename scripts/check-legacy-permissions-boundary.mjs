#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const LEGACY_PERMISSIONS_IMPORT_PATTERN =
  /from\s+['"]@\/utils\/permissions['"]|import\s+['"]@\/utils\/permissions['"]/;

const ALLOWED_FILES = new Set(
  [
    path.join(ROOT, 'src', 'utils', 'permissions.ts'),
    path.join(ROOT, 'src', 'shared', 'access', 'operationalAccessPolicy.ts'),
  ].map(value => path.normalize(value))
);

const toPosix = value => value.split(path.sep).join('/');

const isSourceFile = filePath => {
  const extension = path.extname(filePath);
  if (!SOURCE_EXTENSIONS.has(extension) || filePath.endsWith('.d.ts')) {
    return false;
  }

  const relativePath = toPosix(path.relative(ROOT, filePath));
  if (
    relativePath.includes('/tests/') ||
    relativePath.includes('.test.') ||
    relativePath.includes('.spec.') ||
    relativePath.includes('.stories.')
  ) {
    return false;
  }

  return true;
};

const walkFiles = dirPath => {
  const files = [];

  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
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
  if (ALLOWED_FILES.has(path.normalize(filePath))) {
    continue;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  if (LEGACY_PERMISSIONS_IMPORT_PATTERN.test(source)) {
    violations.push(toPosix(path.relative(ROOT, filePath)));
  }
}

if (violations.length > 0) {
  console.error('\nLegacy permissions imports are only allowed via operationalAccessPolicy:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Legacy permissions boundary checks passed.');
