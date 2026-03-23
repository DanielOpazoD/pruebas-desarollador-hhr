#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'scripts', 'config', 'sustainable-change-policy.json');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const REQUIRED_CHANGE_TYPES = [
  'safe_local_ui',
  'critical_runtime',
  'firestore_release',
  'architecture_contracts',
  'dependency_upgrade',
];
const REQUIRED_UPGRADE_FIELDS = [
  'owner',
  'reason',
  'targetVersion',
  'riskLevel',
  'rollbackPlan',
  'verificationGate',
];
const REQUIRED_EXCEPTION_FIELDS = ['owner', 'reason', 'closureCriteria', 'expiresAt', 'trackedIn'];

const fail = issues => {
  console.error('[sustainable-change-policy] Governance gaps found:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
};

if (!fs.existsSync(CONFIG_PATH) || !fs.existsSync(PACKAGE_JSON_PATH)) {
  fail([
    !fs.existsSync(CONFIG_PATH) ? 'Missing scripts/config/sustainable-change-policy.json' : null,
    !fs.existsSync(PACKAGE_JSON_PATH) ? 'Missing package.json' : null,
  ].filter(Boolean));
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
const issues = [];
const changeTypes = Array.isArray(config.changeTypes) ? config.changeTypes : [];
const changeTypeIds = changeTypes.map(entry => entry?.id).filter(Boolean);

if (config.version !== 1) {
  issues.push(`Expected version 1, received ${String(config.version || 'unknown')}`);
}

for (const requiredId of REQUIRED_CHANGE_TYPES) {
  if (!changeTypeIds.includes(requiredId)) {
    issues.push(`Missing change type ${requiredId}`);
  }
}

const validateScriptRefs = (ownerLabel, scripts) => {
  for (const script of scripts) {
    if (typeof packageJson.scripts?.[script] !== 'string') {
      issues.push(`${ownerLabel}: unknown script ${script}`);
    }
  }
};

const validatePathRefs = (ownerLabel, references) => {
  for (const reference of references) {
    if (!fs.existsSync(path.join(ROOT, reference))) {
      issues.push(`${ownerLabel}: missing path ${reference}`);
    }
  }
};

for (const changeType of changeTypes) {
  const label = typeof changeType?.id === 'string' ? changeType.id : 'unknown-change-type';
  const requiredGates = Array.isArray(changeType?.requiredGates) ? changeType.requiredGates : [];
  const requiredDocs = Array.isArray(changeType?.requiredDocs) ? changeType.requiredDocs : [];
  const requiredArtifacts = Array.isArray(changeType?.requiredArtifacts) ? changeType.requiredArtifacts : [];

  if (requiredGates.length === 0) {
    issues.push(`${label}: missing requiredGates`);
  }
  validateScriptRefs(label, requiredGates);
  validatePathRefs(label, [...requiredDocs, ...requiredArtifacts]);
}

const upgradeFields = Array.isArray(config.dependencyUpgrades?.requiredFields)
  ? config.dependencyUpgrades.requiredFields
  : [];
for (const field of REQUIRED_UPGRADE_FIELDS) {
  if (!upgradeFields.includes(field)) {
    issues.push(`dependencyUpgrades.requiredFields missing ${field}`);
  }
}

for (const category of Array.isArray(config.dependencyUpgrades?.categories)
  ? config.dependencyUpgrades.categories
  : []) {
  const label = `dependencyUpgrades.${category?.id || 'unknown'}`;
  validateScriptRefs(label, Array.isArray(category?.requiredGates) ? category.requiredGates : []);
  validatePathRefs(label, Array.isArray(category?.requiredDocs) ? category.requiredDocs : []);
}

const exceptionFields = Array.isArray(config.guardrailExceptions?.requiredFields)
  ? config.guardrailExceptions.requiredFields
  : [];
for (const field of REQUIRED_EXCEPTION_FIELDS) {
  if (!exceptionFields.includes(field)) {
    issues.push(`guardrailExceptions.requiredFields missing ${field}`);
  }
}

validatePathRefs(
  'guardrailExceptions',
  Array.isArray(config.guardrailExceptions?.governedAllowlists)
    ? config.guardrailExceptions.governedAllowlists
    : []
);
validateScriptRefs(
  'guardrailExceptions',
  [config.guardrailExceptions?.escalationGate].filter(value => typeof value === 'string')
);

validateScriptRefs(
  'definitionOfDone',
  Array.isArray(config.definitionOfDone?.requiredChecks) ? config.definitionOfDone.requiredChecks : []
);
validatePathRefs(
  'definitionOfDone',
  [
    ...(Array.isArray(config.definitionOfDone?.requiredDocs) ? config.definitionOfDone.requiredDocs : []),
    ...(typeof config.definitionOfDone?.releaseScorecard === 'string'
      ? [config.definitionOfDone.releaseScorecard]
      : []),
  ]
);

if (issues.length > 0) {
  fail(issues);
}

console.log(`[sustainable-change-policy] OK (${changeTypes.length} change types)`);
