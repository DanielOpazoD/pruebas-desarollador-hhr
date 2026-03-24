#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const DIRECT_IMPORT_PATTERN =
  /from\s+['"]@\/services\/firebase-runtime\/firestoreRuntime['"]|from\s+['"]@\/services\/infrastructure\/db['"]/;

const SCOPED_ROOTS = [
  path.join(ROOT, 'src', 'features', 'clinical-documents'),
  path.join(ROOT, 'src', 'services', 'storage'),
  path.join(ROOT, 'src', 'services', 'transfers'),
];

const ALLOWED_FILES = new Set(
  [
    path.join(ROOT, 'src', 'services', 'storage', 'firestore', 'firestoreServiceRuntime.ts'),
  ].map(value => path.normalize(value))
);

const toPosix = value => value.split(path.sep).join('/');

const isSourceFile = filePath => {
  const extension = path.extname(filePath);
  if (!SOURCE_EXTENSIONS.has(extension) || filePath.endsWith('.d.ts')) {
    return false;
  }

  const relativePath = toPosix(path.relative(ROOT, filePath));
  if (relativePath.includes('/tests/')) {
    return false;
  }

  return !relativePath.includes('.test.') && !relativePath.includes('.spec.');
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

for (const scopedRoot of SCOPED_ROOTS) {
  for (const filePath of walkFiles(scopedRoot)) {
    if (ALLOWED_FILES.has(path.normalize(filePath))) {
      continue;
    }

    const source = fs.readFileSync(filePath, 'utf8');
    if (DIRECT_IMPORT_PATTERN.test(source)) {
      violations.push(toPosix(path.relative(ROOT, filePath)));
    }
  }
}

if (violations.length > 0) {
  console.error('\nDirect Firestore runtime imports are not allowed in scoped modules:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Firestore runtime boundary checks passed.');
