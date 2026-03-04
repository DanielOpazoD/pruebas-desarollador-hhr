#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'scripts', 'hook-hotspots-limits.json');

const toPosix = value => value.split(path.sep).join('/');

const countLines = filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  return content.length === 0 ? 0 : content.split('\n').length;
};

const loadConfig = () => {
  const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  return parsed.files && typeof parsed.files === 'object' ? parsed.files : {};
};

const files = loadConfig();
const violations = [];

for (const [relativePath, limit] of Object.entries(files)) {
  const absolutePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(absolutePath)) {
    violations.push({
      file: relativePath,
      message: 'configured hotspot file is missing',
    });
    continue;
  }

  const lines = countLines(absolutePath);
  if (lines > limit) {
    violations.push({
      file: relativePath,
      message: `${lines} lines (limit ${limit})`,
    });
  }
}

if (violations.length === 0) {
  console.log('Hook hotspot checks passed.');
  process.exit(0);
}

console.error('\nHook hotspot violations:');
for (const violation of violations) {
  console.error(`- ${toPosix(violation.file)}: ${violation.message}`);
}

process.exit(1);
