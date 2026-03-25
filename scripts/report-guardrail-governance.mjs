#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const CONFIG_PATH = path.join(ROOT, 'scripts/config/guardrail-governance.json');
const REPORT_JSON_PATH = path.join(ROOT, 'reports/guardrail-governance.json');
const REPORT_MD_PATH = path.join(ROOT, 'reports/guardrail-governance.md');

if (!fs.existsSync(CONFIG_PATH)) {
  console.error('[guardrail-governance] Missing scripts/config/guardrail-governance.json');
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
const blockingTiers = Array.isArray(config.blockingTiers) ? config.blockingTiers : [];
const reportOnly = Array.isArray(config.reportOnly) ? config.reportOnly : [];
const qualityChecks = Array.isArray(config.qualityAggregate?.checks) ? config.qualityAggregate.checks : [];
const qualityGroups = Object.entries(
  qualityChecks.reduce((acc, check) => {
    const group = String(check.group || 'unknown');
    acc[group] = acc[group] || [];
    acc[group].push(check.id);
    return acc;
  }, {})
);

const report = {
  generatedAt: new Date().toISOString(),
  version: config.version,
  blockingTierCount: blockingTiers.length,
  reportOnlyCount: reportOnly.length,
  qualityCheckCount: qualityChecks.length,
  releaseConfidence: config.releaseConfidence || null,
  blockingTiers,
  reportOnly,
  qualityAggregate: config.qualityAggregate || null,
  guardrailPolicy: config.guardrailPolicy || {},
};

const markdown = [
  '# Guardrail Governance',
  '',
  `- Version: \`${String(config.version)}\``,
  `- Blocking tiers: \`${String(blockingTiers.length)}\``,
  `- Report-only guards: \`${String(reportOnly.length)}\``,
  `- Quality aggregate checks: \`${String(qualityChecks.length)}\``,
  '',
  '## Blocking Tiers',
  '',
  '| Tier | Script | Required Scripts | Purpose |',
  '| --- | --- | --- | --- |',
  ...blockingTiers.map(tier => {
    const requiredScripts = Array.isArray(tier.requiredScripts)
      ? tier.requiredScripts.join(', ')
      : '';
    return `| ${tier.label} | \`${tier.script}\` | \`${requiredScripts}\` | ${tier.purpose} |`;
  }),
  '',
  '## Release Confidence',
  '',
  `- Script: \`${config.releaseConfidence?.script || 'unknown'}\``,
  `- Required scripts: \`${Array.isArray(config.releaseConfidence?.requiredScripts) ? config.releaseConfidence.requiredScripts.join(', ') : ''}\``,
  `- Purpose: ${config.releaseConfidence?.purpose || ''}`,
  '',
  '## Report-Only Guards',
  '',
  '| Id | Script | Artifact |',
  '| --- | --- | --- |',
  ...reportOnly.map(entry => `| ${entry.id} | \`${entry.script}\` | \`${entry.artifact}\` |`),
  '',
  '## Quality Aggregate',
  '',
  `- Script: \`${config.qualityAggregate?.script || 'unknown'}\``,
  '',
  '| Group | Checks |',
  '| --- | --- |',
  ...qualityGroups.map(([group, checks]) => `| ${group} | \`${checks.join(', ')}\` |`),
  '',
  '## Governance Policy',
  '',
  `- Creation: ${config.guardrailPolicy?.creationRule || ''}`,
  `- Promotion: ${config.guardrailPolicy?.promotionRule || ''}`,
  `- Retirement: ${config.guardrailPolicy?.retirementRule || ''}`,
  '',
].join('\n');

fs.writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
fs.writeFileSync(REPORT_MD_PATH, `${markdown}\n`);

console.log('[guardrail-governance] Report generated at reports/guardrail-governance.json and .md');
