'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CURRENT_VERSION = '5.0.0-beta.1';
const ALPHA2_VERSION = '5.0.0-alpha.2';
const ALPHA3_VERSION = '5.0.0-alpha.3';
const EXPECTED_CANDIDATE =
  '1236becc37e9b4d8ed2334f3cd60b455c248e82d';
const ALPHA2_MERGE =
  'bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b';
const ALPHA3_MERGE =
  '295713798b1487ec2c788b170be2fce32fccea2a';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
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

function main() {
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
  const releaseNotes = read('docs/v5/ALPHA2_RELEASE_NOTES.md');
  const migration = read('docs/v5/ALPHA2_MIGRATION.md');
  const finalization = read('docs/v5/ALPHA2_VERSION_FINALIZATION.md');
  const roadmap = read('fejlesztes_readme.md');
  const implementationStatus = read('docs/v5/V5_IMPLEMENTATION_STATUS.md');
  const integrationRunbook = read('docs/v5/NEXT_V5_INTEGRATION_RUNBOOK.md');
  const betaNotes = read('docs/v5/BETA1_RELEASE_NOTES.md');
  const betaChecklist = read('docs/v5/BETA1_RELEASE_CHECKLIST.md');
  const generatedApiFiles = [
    'desktop-tauri/src/api/generated/api-v2-types.ts',
    'desktop-tauri/src/api/generated/api-v2-operations.ts',
    'desktop-tauri/src/api/generated/api-v2-client.ts'
  ];

  for (const actual of [
    version,
    rootPackage.version,
    rootLock.version,
    rootLock.packages[''].version,
    desktopPackage.version,
    desktopLock.version,
    desktopLock.packages[''].version,
    cargoPackageVersion(cargoLock, 'arduino-led-controller'),
    tauriConfig.version,
    openApi.info.version
  ]) {
    assert.strictEqual(actual, CURRENT_VERSION);
  }

  assert.match(
    cargoToml,
    /\[package\][\s\S]*?version\s*=\s*"5\.0\.0-beta\.1"/
  );

  for (const generatedFile of generatedApiFiles) {
    assert.match(
      read(generatedFile),
      /\/\* OpenAPI verzió: 5\.0\.0-beta\.1 \*\//,
      `A generált OpenAPI kliens verziója eltér: ${generatedFile}`
    );
  }

  for (const document of [releaseNotes, migration, finalization]) {
    assert.ok(document.includes(ALPHA2_VERSION));
    assert.ok(document.includes(EXPECTED_CANDIDATE));
  }

  assert.match(releaseNotes, /127\.0\.0\.1:3100/);
  assert.match(releaseNotes, /127\.0\.0\.1:65535/);
  assert.match(migration, /10\.0\.0\.123:80/);
  assert.match(migration, /nem írja\s+felül/i);
  assert.match(finalization, /nem változtat produkciós runtime logikát/i);

  assert.ok(
    checklist.includes(`Alpha.2 \`next\` merge commit: \`${ALPHA2_MERGE}\``) ||
      checklist.includes(
        'Beolvasztás `next/v5-rearchitecture` ágba (`PR #1`, `bd5cb67`)'
      )
  );
  assert.ok(checklist.includes('- [x] `5.0.0-alpha.2` verziólépés'));
  assert.ok(checklist.includes('- [x] `5.0.0-alpha.3` finalization'));
  assert.ok(checklist.includes('- [ ] Beolvasztás `main` ágba'));

  assert.ok(roadmap.includes(ALPHA3_VERSION));
  assert.ok(roadmap.includes(ALPHA3_MERGE));
  assert.ok(roadmap.includes('10.0.0.123:80'));
  assert.ok(implementationStatus.includes(ALPHA3_VERSION));
  assert.ok(implementationStatus.includes('Tilos / korai'));
  assert.ok(integrationRunbook.includes(ALPHA2_MERGE));
  assert.ok(integrationRunbook.includes(ALPHA3_MERGE));
  assert.ok(integrationRunbook.includes('git merge --abort'));

  assert.ok(betaNotes.includes(CURRENT_VERSION));
  assert.match(betaNotes, /prerelease/i);
  assert.match(betaNotes, /main.*nem módosul/is);
  assert.ok(betaChecklist.includes(CURRENT_VERSION));
  assert.match(betaChecklist, /Teljes alkalmazási staging/);

  console.log('OK: Alpha.2 történeti finalizációs bizonyíték megmaradt');
  console.log('OK: Alpha.3 integrációs bizonyíték megmaradt');
  console.log('OK: a jelenlegi projektverzió 5.0.0-beta.1');
  console.log('OK: generált TypeScript API-kliens Beta.1 verziószinkron');
  console.log('OK: main merge és produkciós telepítés továbbra is külön kapu');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
