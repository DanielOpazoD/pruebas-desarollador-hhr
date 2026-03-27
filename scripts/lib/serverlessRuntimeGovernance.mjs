import fs from 'node:fs';
import path from 'node:path';

const parseJsonFile = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const parsePackageJson = root =>
  parseJsonFile(path.join(root, 'package.json'));

const parseFunctionsPackageJson = root =>
  parseJsonFile(path.join(root, 'functions', 'package.json'));

const parsePackageLock = root =>
  parseJsonFile(path.join(root, 'package-lock.json'));

const parseFunctionsPackageLock = root =>
  parseJsonFile(path.join(root, 'functions', 'package-lock.json'));

const parseNodeMajor = value => {
  if (typeof value !== 'string') return null;
  const match = value.match(/(\d{1,2})/);
  return match ? Number(match[1]) : null;
};

const readText = filePath => fs.readFileSync(filePath, 'utf8');

const parseNvmrc = root => readText(path.join(root, '.nvmrc')).trim();

const parseNetlifyNodeVersion = root => {
  const content = readText(path.join(root, 'netlify.toml'));
  const match = content.match(/NODE_VERSION\s*=\s*"([^"]+)"/);
  return match ? match[1].trim() : null;
};

const collectDependencyEngines = (pkg, lockfile, section) => {
  const dependencies = Object.keys(pkg?.[section] || {});
  const packages = lockfile?.packages || {};

  return dependencies
    .map(name => {
      const lockEntry = packages[`node_modules/${name}`];
      const engines = lockEntry?.engines || {};
      return {
        name,
        section,
        declaredRange: pkg[section][name],
        installedVersion: lockEntry?.version || null,
        node: typeof engines.node === 'string' ? engines.node : null,
        npm: typeof engines.npm === 'string' ? engines.npm : null,
      };
    })
    .filter(entry => entry.node || entry.npm)
    .sort((left, right) => left.name.localeCompare(right.name));
};

export const buildServerlessRuntimeGovernanceSnapshot = root => {
  const packageJson = parsePackageJson(root);
  const packageLock = parsePackageLock(root);
  const functionsPackageJson = parseFunctionsPackageJson(root);
  const functionsPackageLock = parseFunctionsPackageLock(root);
  const nvmrc = parseNvmrc(root);
  const netlifyNodeVersion = parseNetlifyNodeVersion(root);
  const rootEngine = packageJson?.engines?.node || null;
  const firebaseFunctionsEngine = functionsPackageJson?.engines?.node || null;

  const rootRuntime = {
    nvmrc,
    packageEngine: rootEngine,
    netlifyNodeVersion,
    nvmrcMajor: parseNodeMajor(nvmrc),
    packageEngineMajor: parseNodeMajor(rootEngine),
    netlifyNodeVersionMajor: parseNodeMajor(netlifyNodeVersion),
  };

  rootRuntime.aligned =
    rootRuntime.nvmrcMajor !== null &&
    rootRuntime.nvmrcMajor === rootRuntime.packageEngineMajor &&
    rootRuntime.nvmrcMajor === rootRuntime.netlifyNodeVersionMajor;

  return {
    generatedAt: new Date().toISOString(),
    rootBuildRuntime: rootRuntime,
    firebaseFunctionsRuntime: {
      packageEngine: firebaseFunctionsEngine,
      packageEngineMajor: parseNodeMajor(firebaseFunctionsEngine),
    },
    directDependencyEngines: {
      root: [
        ...collectDependencyEngines(packageJson, packageLock, 'dependencies'),
        ...collectDependencyEngines(packageJson, packageLock, 'devDependencies'),
      ],
      firebaseFunctions: collectDependencyEngines(
        functionsPackageJson,
        functionsPackageLock,
        'dependencies'
      ),
    },
  };
};

