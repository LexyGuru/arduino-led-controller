#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const EXPECTED_VERSION = '5.0.0-alpha.2';
const QUALIFIED_CANDIDATE =
  '1236becc37e9b4d8ed2334f3cd60b455c248e82d';
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
    throw new Error(
      `Git hiba: git ${args.join(' ')}\n${result.stderr.trim()}`
    );
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

function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort();
}

function featureChangedFiles() {
  const committed = runGit([
    'diff',
    '--name-only',
    QUALIFIED_CANDIDATE,
    '--'
  ]);
  const untracked = runGit([
    'ls-files',
    '--others',
    '--exclude-standard'
  ]);

  return uniqueSorted([
    ...committed.split('\n'),
    ...untracked.split('\n')
  ]);
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
    'version-sync',
    Object.values(versions).every((value) => value === EXPECTED_VERSION),
    JSON.stringify(versions)
  );
  check(
    'manifest-target-version',
    manifest.targetVersion === EXPECTED_VERSION,
    String(manifest.targetVersion)
  );
  check(
    'manifest-qualified-candidate',
    manifest.candidateCommit === QUALIFIED_CANDIDATE,
    String(manifest.candidateCommit)
  );
  check(
    'manifest-runtime-scope',
    manifest.runtimeCodeChanged === false,
    `runtimeCodeChanged=${manifest.runtimeCodeChanged}`
  );
  check(
    'checklist-next-pending',
    checklist.includes('- [ ] Pull Request a `next/v5-rearchitecture` ágba') &&
      checklist.includes('- [ ] Beolvasztás `main` ágba'),
    'A next és main kapuknak nyitva kell maradniuk.'
  );
  check(
    'roadmap-current-status',
    roadmap.includes('## 0. Aktuális megvalósítási állapot') &&
      roadmap.includes(QUALIFIED_CANDIDATE) &&
      roadmap.includes('10.0.0.123:80'),
    'Hiányos master roadmap státusz.'
  );
  check(
    'implementation-status',
    statusDocument.includes(EXPECTED_VERSION) &&
      statusDocument.includes(QUALIFIED_CANDIDATE) &&
      statusDocument.includes('Tilos / korai'),
    'Hiányos implementációs állapotjelentés.'
  );
  check(
    'integration-runbook',
    integrationRunbook.includes(
      'integration/v5-alpha2-server-modularization → next/v5-rearchitecture'
    ) &&
      integrationRunbook.includes('git merge --abort') &&
      integrationRunbook.includes('X-Device-Key'),
    'Hiányos next integrációs runbook.'
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
      'feature/v5-server-modularization',
      'integration/v5-alpha2-server-modularization',
      'next/v5-rearchitecture'
    ]);
    check(
      'allowed-branch',
      allowedBranches.has(branch),
      branch || '(detached HEAD)'
    );

    const candidateExists = runGit(
      ['cat-file', '-e', `${QUALIFIED_CANDIDATE}^{commit}`],
      { allowFailure: true }
    ) !== null;
    check(
      'qualified-candidate-available',
      candidateExists,
      QUALIFIED_CANDIDATE
    );

    if (candidateExists && branch === 'feature/v5-server-modularization') {
      const allowed = new Set([
        ...manifest.files.map((entry) => entry.path),
        MANIFEST_RELATIVE
      ]);
      const changed = featureChangedFiles();
      const unexpected = changed.filter((file) => !allowed.has(file));
      check(
        'feature-change-scope',
        unexpected.length === 0,
        unexpected.length
          ? `Nem engedélyezett változások: ${unexpected.join(', ')}`
          : `${changed.length} finalizáló/integrációs fájl`
      );
    } else if (branch !== 'feature/v5-server-modularization') {
      warnings.push(
        'Integrációs vagy next ágon a candidate-hez viszonyított fájlscope nem kizárólagos; a teljes repository-validáció kötelező.'
      );
    }
  } else if (checkGit && !gitAvailable) {
    warnings.push('Git-ellenőrzés kihagyva: nincs Git working tree.');
  }

  return {
    schemaVersion: 1,
    passed: errors.length === 0,
    expectedVersion: EXPECTED_VERSION,
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
        ? 'OK: Alpha.2 kész a next integrációs kapura.'
        : 'HIBA: Alpha.2 next integrációs readiness sikertelen.'
    );
  }

  if (!result.passed) process.exitCode = 1;
}

module.exports = {
  EXPECTED_VERSION,
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
