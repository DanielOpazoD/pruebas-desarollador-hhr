#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const HOOK_CONTROLLERS_DIR = path.join(root, 'src', 'hooks', 'controllers');
const FEATURE_CENSUS_CONTROLLERS_DIR = path.join(root, 'src', 'features', 'census', 'controllers');

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
    id: 'accidental-copy-suffix',
    description: 'Accidental duplicate files with " 2" suffix must not be tracked.',
    match: file => /(^|\/)[^/]+ 2\.(ts|tsx|js|jsx|md)$/.test(file),
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

const getSourceBasenameSet = dirPath => {
  if (!fs.existsSync(dirPath)) {
    return new Set();
  }

  return new Set(
    fs
      .readdirSync(dirPath, { withFileTypes: true })
      .filter(entry => entry.isFile() && ['.ts', '.tsx', '.js', '.jsx'].includes(path.extname(entry.name)))
      .map(entry => entry.name)
  );
};

for (const file of trackedFiles) {
  const absolutePath = path.join(root, file);
  if (!fs.existsSync(absolutePath)) continue;

  for (const rule of forbiddenPatterns) {
    if (rule.match(file)) {
      failures.push({ file, rule });
    }
  }
}

const hookControllerBasenames = getSourceBasenameSet(HOOK_CONTROLLERS_DIR);
const featureControllerBasenames = getSourceBasenameSet(FEATURE_CENSUS_CONTROLLERS_DIR);

for (const basename of hookControllerBasenames) {
  if (!featureControllerBasenames.has(basename)) {
    continue;
  }

  const moduleName = basename.replace(/\.[^.]+$/, '');
  const hookPath = path.join(HOOK_CONTROLLERS_DIR, basename);
  const featurePath = path.join(FEATURE_CENSUS_CONTROLLERS_DIR, basename);
  const hookSource = fs.readFileSync(hookPath, 'utf8').trim();
  const featureSource = fs.readFileSync(featurePath, 'utf8');
  const expectedHookShim = `export * from '@/features/census/controllers/${moduleName}';`;
  const forbiddenFeatureBackImport = `@/hooks/controllers/${moduleName}`;

  if (hookSource !== expectedHookShim) {
    failures.push({
      file: path.relative(root, hookPath),
      rule: {
        id: 'census-controller-owner-shim',
        description:
          'Duplicate census controller basenames in hooks/controllers must be compatibility shims that reexport the feature owner.',
      },
    });
  }

  if (featureSource.includes(forbiddenFeatureBackImport)) {
    failures.push({
      file: path.relative(root, featurePath),
      rule: {
        id: 'census-controller-owner-feature',
        description:
          'Feature census controllers must own the implementation and must not reexport back from hooks/controllers.',
      },
    });
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
