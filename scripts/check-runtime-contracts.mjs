#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const constantsContent = fs.readFileSync(
  path.join(workspaceRoot, 'src/constants/runtimeContracts.ts'),
  'utf8'
);
const repositoryReadmeContent = fs.readFileSync(
  path.join(workspaceRoot, 'src/services/repositories/README.md'),
  'utf8'
);

const parseConstant = name => {
  const match = constantsContent.match(new RegExp(`${name}\\s*=\\s*(\\d+)`));
  return match ? Number(match[1]) : null;
};

const clientVersion = parseConstant('CLIENT_RUNTIME_CONTRACT_VERSION');
const backendVersion = parseConstant('BACKEND_RUNTIME_CONTRACT_VERSION');
const minBackendVersion = parseConstant('MIN_SUPPORTED_BACKEND_RUNTIME_CONTRACT_VERSION');

if (![clientVersion, backendVersion, minBackendVersion].every(Number.isInteger)) {
  console.error('[runtime-contracts] Missing runtime contract constants.');
  process.exit(1);
}

if (backendVersion < minBackendVersion) {
  console.error(
    `[runtime-contracts] BACKEND_RUNTIME_CONTRACT_VERSION (${backendVersion}) cannot be lower than MIN_SUPPORTED_BACKEND_RUNTIME_CONTRACT_VERSION (${minBackendVersion}).`
  );
  process.exit(1);
}

if (!repositoryReadmeContent.includes('runtimeCompatibilityPolicy.ts')) {
  console.error(
    '[runtime-contracts] Repository README must document runtimeCompatibilityPolicy.ts.'
  );
  process.exit(1);
}

console.log(
  `[runtime-contracts] OK (client=${clientVersion}, backend=${backendVersion}, min-backend=${minBackendVersion})`
);
