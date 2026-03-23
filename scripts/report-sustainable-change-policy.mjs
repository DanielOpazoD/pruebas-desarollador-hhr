#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'scripts', 'config', 'sustainable-change-policy.json');
const REPORTS_DIR = path.join(ROOT, 'reports');
const JSON_OUTPUT = path.join(REPORTS_DIR, 'sustainable-change-policy.json');
const MD_OUTPUT = path.join(REPORTS_DIR, 'sustainable-change-policy.md');

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const report = {
  generatedAt: new Date().toISOString(),
  version: config.version,
  changeTypes: config.changeTypes || [],
  dependencyUpgrades: config.dependencyUpgrades || {},
  guardrailExceptions: config.guardrailExceptions || {},
  definitionOfDone: config.definitionOfDone || {},
};

const mdLines = [
  '# Sustainable Change Policy',
  '',
  `Generated at: ${report.generatedAt}`,
  `Version: ${report.version}`,
  '',
  '## Change Types',
  '',
  '| Id | Gates | Docs | Artifacts |',
  '| --- | --- | --- | --- |',
];

for (const changeType of report.changeTypes) {
  mdLines.push(
    `| ${changeType.id} | ${(changeType.requiredGates || []).join(', ')} | ${(changeType.requiredDocs || []).join(', ')} | ${(changeType.requiredArtifacts || []).join(', ')} |`
  );
}

mdLines.push('', '## Dependency Upgrades', '');
mdLines.push(`- Required fields: ${(report.dependencyUpgrades.requiredFields || []).join(', ')}`);
mdLines.push('', '## Guardrail Exceptions', '');
mdLines.push(`- Required fields: ${(report.guardrailExceptions.requiredFields || []).join(', ')}`);
mdLines.push(`- Escalation gate: ${report.guardrailExceptions.escalationGate || 'unknown'}`);
mdLines.push('', '## Definition Of Done', '');
mdLines.push(`- Required checks: ${(report.definitionOfDone.requiredChecks || []).join(', ')}`);
mdLines.push(`- Required docs: ${(report.definitionOfDone.requiredDocs || []).join(', ')}`);
mdLines.push(`- Release scorecard: ${report.definitionOfDone.releaseScorecard || 'unknown'}`);

fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
fs.writeFileSync(MD_OUTPUT, `${mdLines.join('\n')}\n`, 'utf8');

console.log('[sustainable-change-policy] Report generated at reports/sustainable-change-policy.{md,json}');
