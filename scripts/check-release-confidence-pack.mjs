#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const configPath = path.join(workspaceRoot, 'scripts/config/release-confidence-pack.json');
const packageJsonPath = path.join(workspaceRoot, 'package.json');

const fail = message => {
  console.error(`[release-confidence-pack] ${message}`);
  process.exit(1);
};

if (!fs.existsSync(configPath)) {
  fail('Missing scripts/config/release-confidence-pack.json');
}

if (!fs.existsSync(packageJsonPath)) {
  fail('Missing package.json');
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const steps = Array.isArray(config.steps) ? config.steps : [];
const profiles = config.profiles && typeof config.profiles === 'object' ? config.profiles : {};
const requiredStepIds = [
  'unit_critical',
  'runtime_smoke',
  'rules_ci',
  'emulator_sync_ci',
  'critical_coverage',
  'flow_performance',
  'e2e_critical_ci',
];

const stepIds = steps.map(step => step?.id).filter(Boolean);
const missingStepIds = requiredStepIds.filter(id => !stepIds.includes(id));
if (missingStepIds.length > 0) {
  fail(`Missing required steps: ${missingStepIds.join(', ')}`);
}

const duplicateStepIds = stepIds.filter((id, index) => stepIds.indexOf(id) !== index);
if (duplicateStepIds.length > 0) {
  fail(`Duplicate step ids: ${[...new Set(duplicateStepIds)].join(', ')}`);
}

for (const profileName of ['blocking', 'full']) {
  const profileSteps = Array.isArray(profiles[profileName]) ? profiles[profileName] : null;
  if (!profileSteps || profileSteps.length === 0) {
    fail(`Missing or empty profile: ${profileName}`);
  }
  const duplicateProfileSteps = profileSteps.filter((stepId, index) => profileSteps.indexOf(stepId) !== index);
  if (duplicateProfileSteps.length > 0) {
    fail(`Profile ${profileName} contains duplicate steps: ${[...new Set(duplicateProfileSteps)].join(', ')}`);
  }
  const unknownProfileSteps = profileSteps.filter(stepId => !stepIds.includes(stepId));
  if (unknownProfileSteps.length > 0) {
    fail(`Profile ${profileName} references unknown steps: ${unknownProfileSteps.join(', ')}`);
  }
}

const blockingStepIds = profiles.blocking || [];
if (blockingStepIds.includes('unit_critical')) {
  fail('Profile blocking must stay compact and must not include unit_critical');
}
for (const stepId of blockingStepIds) {
  const step = steps.find(candidate => candidate.id === stepId);
  if (step?.tier !== 'blocking') {
    fail(`Profile blocking must only include blocking-tier steps: ${stepId}`);
  }
}

const fullStepIds = profiles.full || [];
for (const requiredId of requiredStepIds) {
  if (!fullStepIds.includes(requiredId)) {
    fail(`Profile full must include ${requiredId}`);
  }
}

for (const step of steps) {
  const command = String(step.command || '').trim();
  if (!command) {
    fail(`Step ${step.id || 'unknown'} is missing a command`);
  }

  const npmRunMatch = command.match(/^npm run ([A-Za-z0-9:_-]+)$/);
  if (!npmRunMatch) {
    fail(`Step ${step.id} must use "npm run <script>" format`);
  }

  const scriptName = npmRunMatch[1];
  if (!packageJson.scripts || typeof packageJson.scripts[scriptName] !== 'string') {
    fail(`Step ${step.id} references missing package.json script: ${scriptName}`);
  }

  const tier = String(step.tier || '').trim();
  if (!['blocking', 'extended'].includes(tier)) {
    fail(`Step ${step.id} must declare tier "blocking" or "extended"`);
  }
}

console.log(`[release-confidence-pack] OK (${steps.length} steps)`);
