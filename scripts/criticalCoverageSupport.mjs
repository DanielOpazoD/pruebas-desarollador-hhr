#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx']);
const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx)$/;
const THRESHOLDS_PATH = path.join('scripts', 'config', 'critical-coverage-thresholds.json');

const walkFiles = dirPath => {
  if (!fs.existsSync(dirPath)) return [];

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(absolutePath));
      continue;
    }
    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
};

const readThresholds = root => {
  const raw = fs.readFileSync(path.join(root, THRESHOLDS_PATH), 'utf8');
  const parsed = JSON.parse(raw);
  return parsed.zones && typeof parsed.zones === 'object' ? parsed.zones : {};
};

const countSourceFiles = absoluteRoot =>
  walkFiles(absoluteRoot).filter(filePath => {
    if (!SOURCE_EXTENSIONS.has(path.extname(filePath))) return false;
    return !TEST_FILE_PATTERN.test(filePath);
  }).length;

const countTestFiles = absoluteRoot =>
  walkFiles(absoluteRoot).filter(filePath => TEST_FILE_PATTERN.test(filePath)).length;

const toPercent = value => `${(value * 100).toFixed(1)}%`;

export const buildCriticalCoverageReport = root => {
  const zones = readThresholds(root);

  const criticalZones = Object.entries(zones).map(([sourceRoot, threshold]) => {
    const sourceFileCount = countSourceFiles(path.join(root, sourceRoot));
    const testEntryPoint = threshold.tests;
    const testFileCount = countTestFiles(path.join(root, testEntryPoint));
    const minTestFileCount = Number(threshold.minTestFileCount || 0);
    const minTestToSourceRatio = Number(threshold.minTestToSourceRatio || 0);
    const testToSourceRatio = sourceFileCount === 0 ? 0 : testFileCount / sourceFileCount;
    const passed =
      sourceFileCount > 0 &&
      testFileCount >= minTestFileCount &&
      testToSourceRatio >= minTestToSourceRatio;

    return {
      root: sourceRoot,
      sourceFileCount,
      testEntryPoint,
      testFileCount,
      minTestFileCount,
      minTestToSourceRatio,
      testToSourceRatio,
      passed,
    };
  });

  const failedZones = criticalZones.filter(zone => !zone.passed);

  return {
    generatedAt: new Date().toISOString(),
    mode: 'gated',
    status: failedZones.length === 0 ? 'passing' : 'failing',
    criticalZones,
    notes:
      failedZones.length === 0
        ? [
            'La cobertura crítica quedó bajo gate operativo por zona.',
            'Cada zona exige un mínimo de archivos de test y una proporción test/source sostenida.',
          ]
        : [
            'La cobertura crítica está bajo gate operativo y una o más zonas no cumplen el umbral.',
            'El reporte detalla el déficit para corregirlo antes de mergear cambios.',
          ],
  };
};

export const formatCriticalCoverageMarkdown = report => `# Critical Coverage Report

- Generated: ${report.generatedAt}
- Mode: ${report.mode}
- Status: ${report.status}

## Critical Zones

| Root | Source files | Test entrypoint | Test files | Ratio | Thresholds | Status |
| --- | ---: | --- | ---: | ---: | --- | --- |
${report.criticalZones
  .map(
    zone =>
      `| \`${zone.root}\` | ${zone.sourceFileCount} | \`${zone.testEntryPoint}\` | ${zone.testFileCount} | ${toPercent(zone.testToSourceRatio)} | min ${zone.minTestFileCount} tests / ${toPercent(zone.minTestToSourceRatio)} ratio | ${zone.passed ? 'PASS' : 'FAIL'} |`
  )
  .join('\n')}

## Notes

${report.notes.map(note => `- ${note}`).join('\n')}
`;
