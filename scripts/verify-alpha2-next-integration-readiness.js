#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const EXPECTED_VERSION = '5.0.0-beta.1';
const ALPHA2_VERSION = '5.0.0-alpha.2';
const ALPHA3_VERSION = '5.0.0-alpha.3';
const QUALIFIED_CANDIDATE =
  '1236becc37e9b4d8ed2334f3cd60b455c248e82d';
const ALPHA2_MERGE =
  'bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b';
const ALPHA3_MERGE =
  '295713798b1487ec2c788b170be2fce32fccea2a';
const MANIFEST_RELATIVE =
  'docs/v5/PACKAGE_MANIFEST_ALPHA2_VERSION_FINALIZATION.json';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function runGit(args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8'
  });

  if (result.error) {
    if (allowFailure) return null;
    throw result.error;
  }

  if (result.status !== 0) {
    if (allowFailure) return null;
    throw new Error(`Git hiba: git ${args.join(' ')}\n${result.stderr.trim()}`);
  }

  return result.stdout.trim();
}

function hasGitRepository() {
  return runGit(['rev-parse', '--is-inside-work-tree'], {
    allowFailure: true
  }) === 'true';
}

function cargoPackageVersion(text, packageName) {
  const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = text.match(
    new RegExp(
      `\\[\\[package\\]\\]\\s+name = "${escaped}"\\s+version = "([^"]+)"`,
      'm'
    )
  );
  return match ? match[1] : null;
}

function evaluate({ checkGit = true, requireGit = false } = {}) {
  const checks = [];
  const errors = [];
  const warnings = [];

  function check(name, ok, detail = '') {
    checks.push({ name, ok: Boolean(ok), detail });
    if (!ok) errors.push(`${name}${detail ? `: ${detail}` : ''}`);
  }

  const version = read('VERSION').trim();
  const rootPackage = readJson('package.json');
  const rootLock = readJson('package-lock.json');
  const desktopPackage = readJson('desktop-tauri/package.json');
  const desktopLock = readJson('desktop-tauri/package-lock.json');
  const cargoToml = read('desktop-tauri/src-tauri/Cargo.toml');
  const cargoLock = read('desktop-tauri/src-tauri/Cargo.lock');
  const tauriConfig = readJson('desktop-tauri/src-tauri/tauri.conf.json');
  const openApi = readJson('docs/api/openapi-v2.json');
  const checklist = read('docs/v5/V5_REARCHITECTURE_CHECKLIST.md');
  const roadmap = read('fejlesztes_readme.md');
  const statusDocument = read('docs/v5/V5_IMPLEMENTATION_STATUS.md');
  const integrationRunbook = read('docs/v5/NEXT_V5_INTEGRATION_RUNBOOK.md');
  const betaNotes = read('docs/v5/BETA1_RELEASE_NOTES.md');
  const betaChecklist = read('docs/v5/BETA1_RELEASE_CHECKLIST.md');
  const manifest = readJson(MANIFEST_RELATIVE);

  const versions = {
    VERSION: version,
    package: rootPackage.version,
    packageLock: rootLock.version,
    packageLockRoot: rootLock.packages?.['']?.version,
    desktopPackage: desktopPackage.version,
    desktopLock: desktopLock.version,
    desktopLockRoot: desktopLock.packages?.['']?.version,
    cargoToml: /\[package\][\s\S]*?version\s*=\s*"([^"]+)"/
      .exec(cargoToml)?.[1] || null,
    cargoLock: cargoPackageVersion(cargoLock, 'arduino-led-controller'),
    tauri: tauriConfig.version,
    openApi: openApi.info?.version
  };

  check(
    'current-version-sync',
    Object.values(versions).every((value) => value === EXPECTED_VERSION),
    JSON.stringify(versions)
  );
  check(
    'alpha2-manifest-target-version',
    manifest.targetVersion === ALPHA2_VERSION,
    String(manifest.targetVersion)
  );
  check(
    'alpha2-qualified-candidate',
    manifest.candidateCommit === QUALIFIED_CANDIDATE,
    String(manifest.candidateCommit)
  );
  check('alpha2-runtime-scope', manifest.runtimeCodeChanged === false);
  check(
    'checklist-integrations-main-pending',
    (checklist.includes(ALPHA2_MERGE) || checklist.includes('bd5cb67')) &&
      checklist.includes(ALPHA3_MERGE) &&
      checklist.includes('- [ ] Beolvasztás `main` ágba'),
    'Az Alpha.2 és Alpha.3 legyen a next ágon, a main kapu maradjon nyitva.'
  );
  check(
    'roadmap-alpha3-history',
    roadmap.includes(ALPHA3_VERSION) &&
      roadmap.includes(ALPHA3_MERGE) &&
      roadmap.includes('10.0.0.123:80'),
    'Hiányos Alpha.3 master roadmap bizonyíték.'
  );
  check(
    'implementation-alpha3-history',
    statusDocument.includes(ALPHA3_VERSION) &&
      statusDocument.includes(ALPHA3_MERGE) &&
      statusDocument.includes('Tilos / korai'),
    'Hiányos Alpha.3 implementációs állapotjelentés.'
  );
  check(
    'integration-runbook',
    integrationRunbook.includes(ALPHA2_MERGE) &&
      integrationRunbook.includes(ALPHA3_MERGE) &&
      integrationRunbook.includes('git merge --abort'),
    'Hiányos next integrációs runbook.'
  );
  check(
    'beta1-release-documents',
    betaNotes.includes(EXPECTED_VERSION) &&
      /prerelease/i.test(betaNotes) &&
      /main.*nem módosul/is.test(betaNotes) &&
      betaChecklist.includes(EXPECTED_VERSION) &&
      betaChecklist.includes('Teljes alkalmazási staging'),
    'Hiányos Beta.1 release dokumentáció.'
  );

  const generatedFiles = [
    'desktop-tauri/src/api/generated/api-v2-types.ts',
    'desktop-tauri/src/api/generated/api-v2-operations.ts',
    'desktop-tauri/src/api/generated/api-v2-client.ts'
  ];
  check(
    'generated-client-version',
    generatedFiles.every((file) =>
      read(file).includes(`/* OpenAPI verzió: ${EXPECTED_VERSION} */`)
    ),
    generatedFiles.join(', ')
  );

  const gitAvailable = hasGitRepository();
  if (requireGit && !gitAvailable) {
    check('git-repository', false, 'Nem Git working tree.');
  } else if (checkGit && gitAvailable) {
    const branch = runGit(['branch', '--show-current']);
    const allowedBranches = new Set([
      'next/v5-rearchitecture',
      'feature/v5-alpha3-device-key-header',
      'feature/v5-alpha3-finalization',
      'feature/v5-alpha3-application-staging'
    ]);
    check('allowed-branch', allowedBranches.has(branch), branch || '(detached HEAD)');
    check(
      'qualified-candidate-available',
      runGit(['cat-file', '-e', `${QUALIFIED_CANDIDATE}^{commit}`], {
        allowFailure: true
      }) !== null,
      QUALIFIED_CANDIDATE
    );
    warnings.push(
      'Az Alpha.2 readiness történeti regressziós kapu; az aktív kiadási kapu a Beta.1 distribution manifest és workflow.'
    );
  } else if (checkGit && !gitAvailable) {
    warnings.push('Git-ellenőrzés kihagyva: nincs Git working tree.');
  }

  return {
    schemaVersion: 3,
    passed: errors.length === 0,
    expectedVersion: EXPECTED_VERSION,
    alpha2Version: ALPHA2_VERSION,
    alpha3Version: ALPHA3_VERSION,
    qualifiedCandidate: QUALIFIED_CANDIDATE,
    checks,
    warnings,
    errors
  };
}

function main() {
  const args = new Set(process.argv.slice(2));
  const result = evaluate({
    checkGit: !args.has('--no-git'),
    requireGit: args.has('--require-git')
  });

  if (args.has('--json')) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } else {
    for (const check of result.checks) {
      console.log(
        `${check.ok ? 'OK' : 'HIBA'}: ${check.name}${
          !check.ok && check.detail ? ` — ${check.detail}` : ''
        }`
      );
    }
    for (const warning of result.warnings) {
      console.log(`FIGYELMEZTETÉS: ${warning}`);
    }
    console.log(
      result.passed
        ? 'OK: Alpha.2 és Alpha.3 történeti integráció, valamint Beta.1 aktuális állapot konzisztens.'
        : 'HIBA: integrációs readiness regresszió.'
    );
  }

  if (!result.passed) process.exitCode = 1;
}

module.exports = {
  EXPECTED_VERSION,
  ALPHA2_VERSION,
  ALPHA3_VERSION,
  QUALIFIED_CANDIDATE,
  evaluate
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`HIBA: ${error.message}`);
    process.exitCode = 1;
  }
}
