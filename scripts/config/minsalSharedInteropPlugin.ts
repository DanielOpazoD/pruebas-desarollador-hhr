import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

const virtualMinsalEpisodeTrackerId = 'virtual:minsal-shared-episode-tracker';
const resolvedVirtualMinsalEpisodeTrackerId = `\0${virtualMinsalEpisodeTrackerId}`;
const virtualMinsalMovementCompatibilityId = 'virtual:minsal-shared-movement-compatibility';
const resolvedVirtualMinsalMovementCompatibilityId = `\0${virtualMinsalMovementCompatibilityId}`;

const transformCommonJsNamedExportsToEsm = (
  source: string,
  exportNames: string[],
  sourcePath: string
): string => {
  const exportBlockPattern = /module\.exports\s*=\s*\{[\s\S]*?\};?\s*$/m;
  if (!exportBlockPattern.test(source)) {
    throw new Error(`[minsalSharedInterop] Could not find CommonJS export block in ${sourcePath}`);
  }

  const exportList = exportNames.join(', ');
  return source.replace(
    exportBlockPattern,
    `export { ${exportList} };\nexport default { ${exportList} };\n`
  );
};

export function minsalSharedInteropPlugin(repoRoot: string): Plugin {
  const sharedEpisodeTrackerPath = path.resolve(
    repoRoot,
    'functions',
    'lib',
    'minsal',
    'sharedEpisodeAdmissionTracker.js'
  );
  const sharedMovementCompatibilityPath = path.resolve(
    repoRoot,
    'functions',
    'lib',
    'minsal',
    'sharedMovementCompatibility.js'
  );

  return {
    name: 'minsal-shared-interop',
    resolveId(id) {
      if (id === virtualMinsalEpisodeTrackerId) {
        return resolvedVirtualMinsalEpisodeTrackerId;
      }

      if (id === virtualMinsalMovementCompatibilityId) {
        return resolvedVirtualMinsalMovementCompatibilityId;
      }

      return null;
    },
    load(id) {
      if (id === resolvedVirtualMinsalEpisodeTrackerId) {
        const source = fs.readFileSync(sharedEpisodeTrackerPath, 'utf8');
        return transformCommonJsNamedExportsToEsm(
          source,
          ['createEpisodeAdmissionTracker'],
          sharedEpisodeTrackerPath
        );
      }

      if (id === resolvedVirtualMinsalMovementCompatibilityId) {
        const source = fs.readFileSync(sharedMovementCompatibilityPath, 'utf8');
        return transformCommonJsNamedExportsToEsm(
          source,
          ['normalizeMovementReportingSnapshot'],
          sharedMovementCompatibilityPath
        );
      }

      return null;
    },
  };
}
