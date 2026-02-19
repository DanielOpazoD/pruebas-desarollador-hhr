#!/usr/bin/env node

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const trackedFiles = execSync('git ls-files -z', { encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);

const forbiddenTrackedPaths = [/^dist-man\//, /^dist\//, /^coverage\//];
const forbiddenPathMatches = trackedFiles.filter(file =>
  forbiddenTrackedPaths.some(pattern => pattern.test(file))
);

const checks = [
  {
    id: 'dotenv-gemini-key',
    description: 'Environment files must not contain hardcoded Gemini API keys.',
    appliesTo: file => /(^|\/)\.env(\.|$)/.test(file),
    regex:
      /\b(?:VITE_LOCAL_GEMINI_API_KEY|VITE_GEMINI_API_KEY|GEMINI_API_KEY|VITE_API_KEY|API_KEY)\s*=\s*AIza[0-9A-Za-z_-]{35}/g,
  },
  {
    id: 'client-inline-googlegenai-key',
    description: 'Frontend code must not instantiate GoogleGenAI with a hardcoded API key.',
    appliesTo: file => file.startsWith('src/'),
    regex: /new\s+GoogleGenAI\s*\(\s*\{\s*apiKey\s*:\s*['"]AIza[0-9A-Za-z_-]{35}['"]/g,
  },
  {
    id: 'vite-define-client-ai-key',
    description: 'Vite define config must not inject Gemini/API keys into import.meta.env for client bundles.',
    appliesTo: file => file === 'vite.config.ts',
    regex: /import\.meta\.env\.(VITE_GEMINI_API_KEY|VITE_API_KEY)/g,
  },
];

const failures = [];

const isTextFile = buffer => {
  const sample = buffer.subarray(0, 8000);
  return !sample.includes(0);
};

for (const file of trackedFiles) {
  const absolutePath = path.join(root, file);
  if (!fs.existsSync(absolutePath)) continue;
  if (fs.statSync(absolutePath).isDirectory()) continue;

  const buffer = fs.readFileSync(absolutePath);
  if (!isTextFile(buffer)) continue;

  const content = buffer.toString('utf8');

  for (const check of checks) {
    if (!check.appliesTo(file)) continue;

    if (check.regex.test(content)) {
      failures.push({ file, check });
    }
    check.regex.lastIndex = 0;
  }
}

if (forbiddenPathMatches.length > 0 || failures.length > 0) {
  console.error('\nSecret leakage safeguards failed:\n');

  if (forbiddenPathMatches.length > 0) {
    console.error('- Build/test artifacts are tracked in git (must be untracked):');
    for (const file of forbiddenPathMatches.slice(0, 20)) {
      console.error(`  - ${file}`);
    }
    if (forbiddenPathMatches.length > 20) {
      console.error(`  - ... and ${forbiddenPathMatches.length - 20} more`);
    }
  }

  for (const failure of failures) {
    console.error(`- [${failure.check.id}] ${failure.check.description} (${failure.file})`);
  }

  process.exit(1);
}

console.log('Secret leakage safeguards passed.');
