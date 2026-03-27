#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);
const SCOPED_DIRECT_IMPORT_PATTERN =
  /from\s+['"]@\/services\/firebase-runtime\/firestoreRuntime['"]|from\s+['"]@\/services\/infrastructure\/db['"]/;
const FIRESTORE_RUNTIME_IMPORT_PATTERN =
  /from\s+['"]@\/services\/firebase-runtime\/firestoreRuntime['"]|import\s+['"]@\/services\/firebase-runtime\/firestoreRuntime['"]/;

const SCOPED_ROOTS = [
  path.join(ROOT, 'src', 'features', 'clinical-documents'),
  path.join(ROOT, 'src', 'services', 'storage'),
  path.join(ROOT, 'src', 'services', 'transfers'),
];

const ALLOWED_FILES = new Set(
  [
    path.join(ROOT, 'src', 'services', 'storage', 'firestore', 'firestoreServiceRuntime.ts'),
    path.join(ROOT, 'src', 'services', 'repositories', 'repositoryFirestoreRuntime.ts'),
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

const scopedViolations = [];
const globalViolations = [];

for (const scopedRoot of SCOPED_ROOTS) {
  for (const filePath of walkFiles(scopedRoot)) {
    if (ALLOWED_FILES.has(path.normalize(filePath))) {
      continue;
    }

    const source = fs.readFileSync(filePath, 'utf8');
    if (SCOPED_DIRECT_IMPORT_PATTERN.test(source)) {
      scopedViolations.push(toPosix(path.relative(ROOT, filePath)));
    }
  }
}

for (const filePath of walkFiles(SRC_ROOT)) {
  if (ALLOWED_FILES.has(path.normalize(filePath))) {
    continue;
  }

  const source = fs.readFileSync(filePath, 'utf8');
  if (FIRESTORE_RUNTIME_IMPORT_PATTERN.test(source)) {
    globalViolations.push(toPosix(path.relative(ROOT, filePath)));
  }
}

if (scopedViolations.length > 0 || globalViolations.length > 0) {
  if (scopedViolations.length > 0) {
    console.error('\nDirect Firestore runtime imports are not allowed in scoped modules:');
    for (const violation of scopedViolations) {
      console.error(`- ${violation}`);
    }
  }

  if (globalViolations.length > 0) {
    console.error('\nDirect imports of firestoreRuntime are only allowed via runtime wrappers:');
    for (const violation of globalViolations) {
      console.error(`- ${violation}`);
    }
  }
  process.exit(1);
}

console.log('Firestore runtime boundary checks passed.');
