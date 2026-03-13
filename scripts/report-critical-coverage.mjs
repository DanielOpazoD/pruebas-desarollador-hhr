#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, 'reports');
const JSON_OUTPUT = path.join(REPORTS_DIR, 'critical-coverage.json');
const MD_OUTPUT = path.join(REPORTS_DIR, 'critical-coverage.md');
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);

const CRITICAL_ROOTS = [
  'src/features/census/controllers',
  'src/features/clinical-documents',
  'src/services/transfers',
  'src/services/storage/firestore',
];

const TEST_HINTS = [
  { root: 'src/features/census/controllers', tests: 'src/tests/views/census' },
  { root: 'src/features/clinical-documents', tests: 'src/tests/features/clinical-documents' },
  { root: 'src/services/transfers', tests: 'src/tests/services/transfers' },
  { root: 'src/services/storage/firestore', tests: 'src/tests/services/storage' },
];

const walkFiles = dirPath => {
  if (!fs.existsSync(dirPath)) return [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(absolutePath));
      continue;
    }
    if (entry.isFile()) {
      result.push(absolutePath);
    }
  }
  return result;
};

const countSourceFiles = root =>
  walkFiles(path.join(ROOT, root)).filter(filePath => {
    if (!SOURCE_EXTENSIONS.has(path.extname(filePath))) return false;
    return !filePath.endsWith('.test.ts') && !filePath.endsWith('.test.tsx');
  }).length;

const countTestFiles = testsRoot =>
  walkFiles(path.join(ROOT, testsRoot)).filter(filePath =>
    /\.(test|spec)\.(ts|tsx)$/.test(filePath)
  ).length;

const report = {
  generatedAt: new Date().toISOString(),
  mode: 'report-only',
  status: 'baseline-pending',
  criticalZones: CRITICAL_ROOTS.map(root => {
    const hint = TEST_HINTS.find(entry => entry.root === root);
    return {
      root,
      sourceFileCount: countSourceFiles(root),
      testEntryPoint: hint?.tests ?? null,
      testFileCount: hint ? countTestFiles(hint.tests) : 0,
    };
  }),
  notes: [
    'La cobertura crítica queda en modo gradual/report-only.',
    'Este reporte publica el baseline operativo de zonas críticas y sus entrypoints de test.',
    'El gate blocking puede activarse más adelante cuando exista baseline de coverage automatizado por zona.',
  ],
};

fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(JSON_OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const markdown = `# Critical Coverage Baseline

- Generated: ${report.generatedAt}
- Mode: ${report.mode}
- Status: ${report.status}

## Critical Zones

| Root | Source files | Test entrypoint | Test files |
| --- | ---: | --- | ---: |
${report.criticalZones
  .map(
    zone =>
      `| \`${zone.root}\` | ${zone.sourceFileCount} | ${zone.testEntryPoint ? `\`${zone.testEntryPoint}\`` : '-'} | ${zone.testFileCount} |`
  )
  .join('\n')}

## Notes

${report.notes.map(note => `- ${note}`).join('\n')}
`;

fs.writeFileSync(MD_OUTPUT, `${markdown}\n`, 'utf8');

console.log('[critical-coverage] Report generated at reports/critical-coverage.{md,json}');
