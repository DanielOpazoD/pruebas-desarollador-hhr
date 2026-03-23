#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src');
const GOVERNANCE_PATH = path.join(ROOT, 'src', 'services', 'repositories', 'legacyBridgeGovernance.ts');
const LEGACY_BRIDGE_SERVICE_PATH = path.normalize(
  path.join(ROOT, 'src', 'services', 'repositories', 'legacyRecordBridgeService.ts')
);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

const IMPORT_EXPORT_REGEX =
  /(?:^|\n)\s*import(?:[\s\S]*?\sfrom\s*)?["']([^"']+)["']|(?:^|\n)\s*export\s+[^;\n]*\sfrom\s*["']([^"']+)["']/g;
const DYNAMIC_IMPORT_REGEX = /import\(\s*["']([^"']+)["']\s*\)/g;

const toPosix = value => value.split(path.sep).join('/');

const governanceContent = fs.readFileSync(GOVERNANCE_PATH, 'utf8');
const allowedImporterMatch = governanceContent.match(
  /LEGACY_BRIDGE_ALLOWED_IMPORTERS\s*=\s*\[([\s\S]*?)\]\s*as const/
);
const allowedImporters = new Set(
  allowedImporterMatch
    ? [...allowedImporterMatch[1].matchAll(/'([^']+)'/g)].map(match => match[1])
    : []
);

const isSourceFile = filePath => {
  const extension = path.extname(filePath);
  if (!SOURCE_EXTENSIONS.has(extension) || filePath.endsWith('.d.ts')) return false;

  const relativePath = toPosix(path.relative(ROOT, filePath));
  if (relativePath.includes('/tests/')) return false;
  if (relativePath.includes('.test.') || relativePath.includes('.spec.')) return false;
  return !relativePath.includes('.stories.');
};

const walkFiles = dirPath => {
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

const resolveImport = (importerFilePath, importPath) => {
  if (!importPath.startsWith('@/') && !importPath.startsWith('.')) return null;

  const basePath = importPath.startsWith('@/')
    ? path.join(SRC_ROOT, importPath.slice(2))
    : path.resolve(path.dirname(importerFilePath), importPath);

  const candidates = [];
  if (path.extname(basePath)) {
    candidates.push(basePath);
  } else {
    for (const extension of SOURCE_EXTENSIONS) {
      candidates.push(`${basePath}${extension}`);
    }
    for (const extension of SOURCE_EXTENSIONS) {
      candidates.push(path.join(basePath, `index${extension}`));
    }
  }

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.normalize(candidate);
    }
  }

  return null;
};

const violations = [];
const files = walkFiles(SRC_ROOT);

for (const absolutePath of files) {
  const importerPath = toPosix(path.relative(ROOT, absolutePath));
  if (allowedImporters.has(importerPath)) continue;

  const source = fs.readFileSync(absolutePath, 'utf8');
  IMPORT_EXPORT_REGEX.lastIndex = 0;
  DYNAMIC_IMPORT_REGEX.lastIndex = 0;

  let match;
  while ((match = IMPORT_EXPORT_REGEX.exec(source)) !== null) {
    const importPath = match[1] || match[2];
    if (!importPath) continue;
    const resolved = resolveImport(absolutePath, importPath);
    if (resolved === LEGACY_BRIDGE_SERVICE_PATH) {
      violations.push(`${importerPath} -> ${importPath}`);
    }
  }

  while ((match = DYNAMIC_IMPORT_REGEX.exec(source)) !== null) {
    const importPath = match[1];
    if (!importPath) continue;
    const resolved = resolveImport(absolutePath, importPath);
    if (resolved === LEGACY_BRIDGE_SERVICE_PATH) {
      violations.push(`${importerPath} -> ${importPath}`);
    }
  }
}

if (violations.length > 0) {
  console.error('\nLegacy bridge boundary violations:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Legacy bridge boundary checks passed.');
