'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const EXPECTED_VERSION = '5.0.0-alpha.2';
const EXPECTED_CANDIDATE =
  '1236becc37e9b4d8ed2334f3cd60b455c248e82d';

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
  const generatedApiFiles = [
    'desktop-tauri/src/api/generated/api-v2-types.ts',
    'desktop-tauri/src/api/generated/api-v2-operations.ts',
    'desktop-tauri/src/api/generated/api-v2-client.ts'
  ];

  assert.strictEqual(version, EXPECTED_VERSION);
  assert.strictEqual(rootPackage.version, EXPECTED_VERSION);
  assert.strictEqual(rootLock.version, EXPECTED_VERSION);
  assert.strictEqual(rootLock.packages[''].version, EXPECTED_VERSION);
  assert.strictEqual(desktopPackage.version, EXPECTED_VERSION);
  assert.strictEqual(desktopLock.version, EXPECTED_VERSION);
  assert.strictEqual(desktopLock.packages[''].version, EXPECTED_VERSION);
  assert.match(
    cargoToml,
    /\[package\][\s\S]*?version\s*=\s*"5\.0\.0-alpha\.2"/
  );
  assert.strictEqual(
    cargoPackageVersion(cargoLock, 'arduino-led-controller'),
    EXPECTED_VERSION
  );
  assert.strictEqual(tauriConfig.version, EXPECTED_VERSION);
  assert.strictEqual(openApi.info.version, EXPECTED_VERSION);

  for (const generatedFile of generatedApiFiles) {
    assert.match(
      read(generatedFile),
      /\/\* OpenAPI verzió: 5\.0\.0-alpha\.2 \*\//,
      `A generált OpenAPI kliens verziója eltér: ${generatedFile}`
    );
  }

  assert.match(
    checklist,
    /- \[x\] Teljes izolált LXC integrációs és rollback teszt/
  );
  assert.match(checklist, /- \[x\] Staging telepítés és readiness/);
  assert.match(checklist, /- \[x\] Promotion és teljes execution receipt-lánc/);
  assert.match(
    checklist,
    /- \[x\] `FINALIZE_ALPHA2_VERSION_SYNC` jóváhagyás/
  );
  assert.match(checklist, /- \[x\] `5\.0\.0-alpha\.2` verziólépés/);
  assert.match(checklist, /- \[ ] Beolvasztás `next\/v5-rearchitecture` ágba/);
  assert.match(checklist, /- \[ ] Beolvasztás `main` ágba/);

  for (const document of [
    releaseNotes,
    migration,
    finalization,
    roadmap,
    implementationStatus
  ]) {
    assert.ok(document.includes(EXPECTED_VERSION));
    assert.ok(document.includes(EXPECTED_CANDIDATE));
  }

  assert.match(releaseNotes, /127\.0\.0\.1:3100/);
  assert.match(releaseNotes, /127\.0\.0\.1:65535/);
  assert.match(migration, /10\.0\.0\.123:80/);
  assert.match(migration, /nem írja\s+felül/i);
  assert.match(finalization, /nem változtat produkciós runtime logikát/i);
  assert.match(roadmap, /## 0\. Aktuális megvalósítási állapot/);
  assert.match(roadmap, /10\.0\.0\.123:80/);
  assert.match(implementationStatus, /Produkciós V5 telepítés \| Tilos \/ korai/);
  assert.match(implementationStatus, /X-Device-Key/);
  assert.match(
    integrationRunbook,
    /integration\/v5-alpha2-server-modularization → next\/v5-rearchitecture/
  );
  assert.match(integrationRunbook, /git merge --abort/);

  console.log('OK: teljes 5.0.0-alpha.2 verziószinkron');
  console.log('OK: npm, Tauri, Cargo, lockfile és OpenAPI verziók');
  console.log('OK: generált TypeScript API-kliens verziószinkron');
  console.log('OK: Alpha.2 release notes, migráció és checklist');
  console.log('OK: master roadmap, implementációs státusz és next runbook');
  console.log('OK: main merge és produkciós telepítés továbbra is külön kapu');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
