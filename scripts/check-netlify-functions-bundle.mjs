#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { build } from 'esbuild';

const ROOT = process.cwd();
const FUNCTIONS_DIR = path.join(ROOT, 'netlify', 'functions');
const TMP_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'hhr-netlify-bundle-'));

const parseExternalModules = () => {
  const content = fs.readFileSync(path.join(ROOT, 'netlify.toml'), 'utf8');
  const match = content.match(/external_node_modules\s*=\s*\[([^\]]*)\]/m);
  if (!match) return [];

  return match[1]
    .split(',')
    .map(part => part.trim().replace(/^"|"$/g, ''))
    .filter(Boolean);
};

const entryPoints = fs
  .readdirSync(FUNCTIONS_DIR)
  .filter(fileName => /\.(ts|js)$/.test(fileName))
  .map(fileName => path.join(FUNCTIONS_DIR, fileName))
  .sort();

if (entryPoints.length === 0) {
  console.error('[netlify-functions-bundle] No entrypoints found in netlify/functions');
  process.exit(1);
}

const external = parseExternalModules();
const failures = [];

try {
  for (const entryPoint of entryPoints) {
    const fileName = path.basename(entryPoint, path.extname(entryPoint));
    try {
      await build({
        entryPoints: [entryPoint],
        bundle: true,
        platform: 'node',
        format: 'cjs',
        target: 'node22',
        write: true,
        outfile: path.join(TMP_DIR, `${fileName}.cjs`),
        tsconfig: path.join(ROOT, 'tsconfig.json'),
        external,
        logLevel: 'silent',
      });
    } catch (error) {
      const errors = Array.isArray(error?.errors)
        ? error.errors.map(item => item.text).join('; ')
        : error instanceof Error
          ? error.message
          : 'Unknown bundling error';
      failures.push(`${path.relative(ROOT, entryPoint)} -> ${errors}`);
    }
  }
} finally {
  fs.rmSync(TMP_DIR, { recursive: true, force: true });
}

if (failures.length > 0) {
  console.error('[netlify-functions-bundle] Bundling failures detected:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(
  `[netlify-functions-bundle] OK (${entryPoints.length} entrypoints bundled with ${external.length} external modules)`
);

