#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const configPath = path.join(workspaceRoot, 'scripts/config/critical-smoke-pack.json');

const fail = message => {
  console.error(`[critical-smoke-pack] ${message}`);
  process.exit(1);
};

if (!fs.existsSync(configPath)) {
  fail('Missing scripts/config/critical-smoke-pack.json');
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const scenarios = Array.isArray(config.scenarios) ? config.scenarios : [];
const requiredScenarioIds = [
  'cold_boot',
  'login',
  'offline_to_online',
  'sync_conflict',
  'export',
  'clinical_documents',
];

const scenarioIds = scenarios.map(scenario => scenario?.id).filter(Boolean);
const missingScenarioIds = requiredScenarioIds.filter(id => !scenarioIds.includes(id));
if (missingScenarioIds.length > 0) {
  fail(`Missing required scenarios: ${missingScenarioIds.join(', ')}`);
}

const duplicateScenarioIds = scenarioIds.filter((id, index) => scenarioIds.indexOf(id) !== index);
if (duplicateScenarioIds.length > 0) {
  fail(`Duplicate scenario ids: ${[...new Set(duplicateScenarioIds)].join(', ')}`);
}

for (const scenario of scenarios) {
  if (typeof scenario.file !== 'string' || scenario.file.trim().length === 0) {
    fail(`Scenario ${scenario.id || 'unknown'} is missing a file`);
  }

  const scenarioFile = path.join(workspaceRoot, scenario.file);
  if (!fs.existsSync(scenarioFile)) {
    fail(`Scenario ${scenario.id} points to missing file: ${scenario.file}`);
  }
}

console.log(`[critical-smoke-pack] OK (${scenarios.length} scenarios)`);
