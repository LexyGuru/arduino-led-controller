'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(
  ROOT,
  'docs/v5/PACKAGE_MANIFEST_ALPHA3_DEVICE_KEY_HEADER.json'
);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  assert.strictEqual(manifest.schemaVersion, 1);
  assert.strictEqual(
    manifest.package,
    'v5-alpha3-device-key-header-migration-complete-v3'
  );
  assert.strictEqual(
    manifest.baseCommit,
    'bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b'
  );
  assert.strictEqual(
    manifest.targetBranch,
    'feature/v5-alpha3-device-key-header'
  );
  assert.strictEqual(manifest.applicationVersionBefore, '5.0.0-alpha.2');
  assert.strictEqual(manifest.applicationVersionAfter, '5.0.0-alpha.2');
  assert.strictEqual(manifest.firmwareVersionBefore, '4.1.20');
  assert.strictEqual(manifest.firmwareVersionAfter, '4.1.21');
  assert.strictEqual(manifest.runtimeCodeChanged, true);
  assert.strictEqual(manifest.productionDeploymentIncluded, false);
  assert.strictEqual(manifest.mainMergeIncluded, false);
  assert.strictEqual(manifest.queryFallbackEnabled, true);
  assert.strictEqual(manifest.hardwareValidationRequired, true);
  assert.strictEqual(manifest.alpha3FinalizationIncluded, false);
  assert.strictEqual(manifest.firmwareLatestReleaseProtected, true);
  assert.strictEqual(manifest.alpha2ReadinessRegressionAligned, true);
  assert.strictEqual(manifest.desktopTypescriptBuildFixed, true);
  assert.ok(Array.isArray(manifest.files));
  assert.strictEqual(manifest.fileCountExcludingManifest, manifest.files.length);
  assert.ok(manifest.files.length >= 31);

  const packageJson = readJson('package.json');
  assert.strictEqual(packageJson.version, '5.0.0-alpha.2');
  assert.strictEqual(
    packageJson.scripts['test:alpha3-device-key-header'],
    'node scripts/test-alpha3-device-key-header.js'
  );
  assert.strictEqual(
    packageJson.scripts['test:alpha3-device-key-manifest'],
    'node scripts/test-alpha3-device-key-manifest.js'
  );
  assert.strictEqual(
    packageJson.scripts['test:alpha3-desktop-typescript'],
    'node scripts/test-alpha3-desktop-typescript-contract.js'
  );

  const required = new Set([
    '.env.example',
    '.github/workflows/firmware-build.yml',
    'README.md',
    'package.json',
    'server/arduino/arduino-client.js',
    'server2_legacy.js',
    'desktop-tauri/src-tauri/src/lib.rs',
    'desktop-tauri/src/main.tsx',
    'desktop-tauri/src/vite-env.d.ts',
    'desktop-tauri/src/components/v5/V5PreflightPanel.tsx',
    'firmware/ArduinoLedController/ArduinoLedController.ino',
    'firmware/ArduinoLedController/secrets.example.h',
    'firmware/README.md',
    'docs/api/API_V2_CONTRACT.md',
    'docs/v5/ALPHA3_DEVICE_KEY_MIGRATION.md',
    'docs/v5/ALPHA3_HARDWARE_TEST_RUNBOOK.md',
    'docs/v5/ALPHA3_RELEASE_NOTES_DRAFT.md',
    'docs/v5/V5_REARCHITECTURE_CHECKLIST.md',
    'docs/v5/V5_IMPLEMENTATION_STATUS.md',
    'docs/v5/NEXT_V5_INTEGRATION_RUNBOOK.md',
    'fejlesztes_readme.md',
    'scripts/test-arduino-client.js',
    'scripts/test-alpha3-device-key-header.js',
    'scripts/test-alpha3-device-key-manifest.js',
    'scripts/test-alpha3-desktop-typescript-contract.js',
    'scripts/test-v5-documentation-status.js',
    'scripts/test-alpha2-next-integration-readiness.js',
    'scripts/test-alpha2-version-finalization.js',
    'scripts/verify-alpha2-next-integration-readiness.js',
    'scripts/validate-repository.sh'
  ]);

  const seen = new Set();
  for (const entry of manifest.files) {
    assert.strictEqual(typeof entry.path, 'string');
    assert.strictEqual(seen.has(entry.path), false, `Duplikált útvonal: ${entry.path}`);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(entry.bytes) && entry.bytes > 0);
    assert.notStrictEqual(entry.path, 'VERSION', 'Az alkalmazásverzió nem emelhető ebben a csomagban.');
    assert.strictEqual(entry.path.startsWith('deploy/'), false, `Deploy fájl nem része az első Alpha.3 csomagnak: ${entry.path}`);
    assert.strictEqual(entry.path.endsWith('/secrets.h'), false, `Titkos firmware-fájl nem csomagolható: ${entry.path}`);
    assert.notStrictEqual(entry.path, '.env', 'Valódi .env nem csomagolható.');
    assert.strictEqual(
      entry.path.startsWith('server/') && entry.path !== 'server/arduino/arduino-client.js',
      false,
      `Nem várt szerver runtime fájl: ${entry.path}`
    );

    const absolute = path.join(ROOT, entry.path);
    assert.strictEqual(fs.existsSync(absolute), true, `Hiányzó fájl: ${entry.path}`);
    const content = fs.readFileSync(absolute);
    assert.strictEqual(content.length, entry.bytes, `Méreteltérés: ${entry.path}`);
    assert.strictEqual(sha256(content), entry.sha256, `SHA-256 eltérés: ${entry.path}`);
    seen.add(entry.path);
  }

  for (const relativePath of required) {
    assert.strictEqual(seen.has(relativePath), true, `Hiányzó kötelező fájl: ${relativePath}`);
  }

  assert.strictEqual(
    seen.has('docs/v5/PACKAGE_MANIFEST_ALPHA3_DEVICE_KEY_HEADER.json'),
    false,
    'A manifest nem hash-elheti önmagát.'
  );

  console.log('OK: Alpha.3 device-key header package manifest és SHA-256');
  console.log('OK: az alkalmazásverzió 5.0.0-alpha.2 marad a hardveres gate-ig');
  console.log('OK: nincs produkciós deploy, main merge vagy titkos fájl a csomagban');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
