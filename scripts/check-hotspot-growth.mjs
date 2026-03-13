#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const MODULE_ALLOWLIST_PATH = path.join(ROOT, 'scripts', 'module-size-allowlist.json');
const HOOK_LIMITS_PATH = path.join(ROOT, 'scripts', 'hook-hotspots-limits.json');

const countLines = filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.length === 0 ? 0 : content.split('\n').length;
};

const readJson = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const validateModuleHotspots = () => {
  const config = readJson(MODULE_ALLOWLIST_PATH);
  const globalMax = typeof config.globalMax === 'number' ? config.globalMax : 400;
  const allowlist = config.allowlist && typeof config.allowlist === 'object' ? config.allowlist : {};
  const backlog = config.backlog && typeof config.backlog === 'object' ? config.backlog : {};
  const violations = [];

  for (const [relativePath, limit] of Object.entries(allowlist)) {
    if (typeof limit !== 'number' || limit <= globalMax) {
      continue;
    }

    const metadata = backlog[relativePath];
    if (!metadata || typeof metadata !== 'object') {
      violations.push(`${relativePath}: missing documented backlog metadata`);
      continue;
    }

    if (metadata.limit !== limit) {
      violations.push(`${relativePath}: backlog limit ${metadata.limit} does not match allowlist limit ${limit}`);
    }

    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) {
      violations.push(`${relativePath}: tracked hotspot file is missing`);
      continue;
    }

    const currentLines = countLines(absolutePath);
    if (currentLines > limit) {
      violations.push(`${relativePath}: ${currentLines} lines exceeds documented limit ${limit}`);
    }
  }

  return violations;
};

const validateHookHotspots = () => {
  const config = readJson(HOOK_LIMITS_PATH);
  const files = config.files && typeof config.files === 'object' ? config.files : {};
  const backlog = config.backlog && typeof config.backlog === 'object' ? config.backlog : {};
  const violations = [];

  for (const [relativePath, limit] of Object.entries(files)) {
    if (typeof limit !== 'number') {
      continue;
    }

    const metadata = backlog[relativePath];
    if (!metadata || typeof metadata !== 'object') {
      violations.push(`${relativePath}: missing hotspot backlog metadata`);
      continue;
    }

    if (metadata.limit !== limit) {
      violations.push(`${relativePath}: backlog limit ${metadata.limit} does not match hotspot limit ${limit}`);
    }

    const absolutePath = path.join(ROOT, relativePath);
    if (!fs.existsSync(absolutePath)) {
      violations.push(`${relativePath}: tracked hook hotspot file is missing`);
      continue;
    }

    const currentLines = countLines(absolutePath);
    if (currentLines > limit) {
      violations.push(`${relativePath}: ${currentLines} lines exceeds documented hotspot limit ${limit}`);
    }
  }

  return violations;
};

const violations = [...validateModuleHotspots(), ...validateHookHotspots()];

if (violations.length === 0) {
  console.log('Hotspot growth checks passed.');
  process.exit(0);
}

console.error('\nHotspot growth violations:');
for (const violation of violations) {
  console.error(`- ${violation}`);
}

process.exit(1);
