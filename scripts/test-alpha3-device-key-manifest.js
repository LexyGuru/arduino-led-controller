'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const ALPHA3_VERSION = '5.0.0-alpha.3';
const CURRENT_VERSION = '5.0.0-beta.1';
const MANIFEST_PATH = path.join(
  ROOT,
  'docs/v5/PACKAGE_MANIFEST_ALPHA3_DEVICE_KEY_HEADER.json'
);

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath));
}

function readText(relativePath) {
  return read(relativePath).toString('utf8');
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function cargoPackageVersion(lockText, packageName) {
  const blocks = lockText.split(/\n\[\[package\]\]\n/);
  for (const block of blocks) {
    const name = block.match(/^name = "([^"]+)"$/m)?.[1];
    const version = block.match(/^version = "([^"]+)"$/m)?.[1];
    if (name === packageName) {
      return version;
    }
  }
  return null;
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  assert.strictEqual(manifest.schemaVersion, 1);
  assert.strictEqual(manifest.package, 'v5-alpha3-finalization-v11');
  assert.strictEqual(
    manifest.baseIntegrationCommit,
    '295713798b1487ec2c788b170be2fce32fccea2a'
  );
  assert.strictEqual(manifest.targetBranch, 'next/v5-rearchitecture');
  assert.strictEqual(manifest.applicationVersionBefore, '5.0.0-alpha.2');
  assert.strictEqual(manifest.applicationVersionAfter, ALPHA3_VERSION);
  assert.strictEqual(manifest.firmwareVersion, '4.1.21');
  assert.strictEqual(
    manifest.featureCommit,
    'e2dc8ac41edf39717b4e2708e6b03aba0b6431bb'
  );
  assert.strictEqual(
    manifest.mergeParentNext,
    'bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b'
  );
  assert.strictEqual(
    manifest.mergeParentFeature,
    'e2dc8ac41edf39717b4e2708e6b03aba0b6431bb'
  );
  assert.strictEqual(manifest.firmwareWorkflowRun, 30536184636);
  assert.strictEqual(manifest.firmwareWorkflowConclusion, 'success');
  assert.strictEqual(manifest.hardwareValidationCompleted, true);
  assert.deepStrictEqual(
    manifest.hardwareAuthMatrix,
    [200, 401, 401, 200, 401, 400, 200]
  );
  assert.strictEqual(manifest.nodeStagingCompleted, true);
  assert.strictEqual(manifest.tauriStagingCompleted, true);
  assert.strictEqual(manifest.fallbackOffGateCompleted, true);
  assert.strictEqual(manifest.rollbackVerified, true);
  assert.strictEqual(manifest.nextIntegrationCompleted, true);
  assert.strictEqual(manifest.alpha3FinalizationIncluded, true);
  assert.strictEqual(manifest.queryFallbackEnabled, true);
  assert.strictEqual(manifest.mainMergeIncluded, false);
  assert.strictEqual(manifest.productionDeploymentIncluded, false);
  assert.strictEqual(manifest.publicFirmwareReleaseUpdated, false);
  assert.strictEqual(manifest.tauriArtifactWorkflowIncluded, true);
  assert.strictEqual(
    manifest.tauriArtifactWorkflow,
    '.github/workflows/tauri-artifact-build.yml'
  );
  assert.strictEqual(manifest.tauriArtifactPublicRelease, false);

  const expectedVersionFiles = [
    'VERSION',
    'package.json',
    'package-lock.json',
    'desktop-tauri/package.json',
    'desktop-tauri/package-lock.json',
    'desktop-tauri/src-tauri/Cargo.toml',
    'desktop-tauri/src-tauri/Cargo.lock',
    'desktop-tauri/src-tauri/tauri.conf.json',
    'docs/api/openapi-v2.json'
  ];
  assert.deepStrictEqual(manifest.versionFiles, expectedVersionFiles);

  assert.strictEqual(readText('VERSION').trim(), CURRENT_VERSION);
  const rootPackage = readJson('package.json');
  const rootLock = readJson('package-lock.json');
  const desktopPackage = readJson('desktop-tauri/package.json');
  const desktopLock = readJson('desktop-tauri/package-lock.json');
  const tauriConfig = readJson('desktop-tauri/src-tauri/tauri.conf.json');
  const openApi = readJson('docs/api/openapi-v2.json');
  const cargoToml = readText('desktop-tauri/src-tauri/Cargo.toml');
  const cargoLock = readText('desktop-tauri/src-tauri/Cargo.lock');

  assert.strictEqual(rootPackage.version, CURRENT_VERSION);
  assert.strictEqual(rootLock.version, CURRENT_VERSION);
  assert.strictEqual(rootLock.packages[''].version, CURRENT_VERSION);
  assert.strictEqual(desktopPackage.version, CURRENT_VERSION);
  assert.strictEqual(desktopLock.version, CURRENT_VERSION);
  assert.strictEqual(desktopLock.packages[''].version, CURRENT_VERSION);
  assert.match(cargoToml, /^version = "5\.0\.0-beta\.1"$/m);
  assert.strictEqual(
    cargoPackageVersion(cargoLock, 'arduino-led-controller'),
    CURRENT_VERSION
  );
  assert.strictEqual(tauriConfig.version, CURRENT_VERSION);
  assert.strictEqual(openApi.info.version, CURRENT_VERSION);

  for (const generatedFile of [
    'desktop-tauri/src/api/generated/api-v2-types.ts',
    'desktop-tauri/src/api/generated/api-v2-operations.ts',
    'desktop-tauri/src/api/generated/api-v2-client.ts'
  ]) {
    assert.ok(
      readText(generatedFile).includes(
        `/* OpenAPI verzió: ${CURRENT_VERSION} */`
      )
    );
  }

  const releaseNotes = readText('docs/v5/ALPHA3_RELEASE_NOTES_DRAFT.md');
  const runbook = readText('docs/v5/ALPHA3_HARDWARE_TEST_RUNBOOK.md');
  const roadmap = readText('fejlesztes_readme.md');
  const implementationStatus = readText('docs/v5/V5_IMPLEMENTATION_STATUS.md');
  const checklist = readText('docs/v5/V5_REARCHITECTURE_CHECKLIST.md');
  const integrationRunbook = readText('docs/v5/NEXT_V5_INTEGRATION_RUNBOOK.md');
  const betaNotes = readText('docs/v5/BETA1_RELEASE_NOTES.md');
  const betaManifest = readJson(
    'docs/v5/PACKAGE_MANIFEST_BETA1_DISTRIBUTION.json'
  );

  assert.match(releaseNotes, /^# V5 Alpha\.3 – kiadási jegyzetek$/m);
  assert.ok(releaseNotes.includes(`\`${ALPHA3_VERSION}\``));
  assert.ok(
    releaseNotes.includes(
      '`295713798b1487ec2c788b170be2fce32fccea2a`'
    )
  );
  assert.ok(
    runbook.includes('## Alpha.3 integráció és verziófinalizálás – 2026-07-30')
  );
  assert.ok(runbook.includes('Az Alpha.3 integrációs állapota: **COMPLETED**'));

  for (const document of [
    roadmap,
    implementationStatus,
    checklist,
    integrationRunbook
  ]) {
    assert.ok(
      document.includes('295713798b1487ec2c788b170be2fce32fccea2a')
    );
    assert.ok(document.includes(ALPHA3_VERSION));
  }

  assert.ok(betaNotes.includes(CURRENT_VERSION));
  assert.strictEqual(betaManifest.applicationVersionAfter, CURRENT_VERSION);
  assert.strictEqual(betaManifest.githubPrerelease, true);

  assert.ok(Array.isArray(manifest.files));
  assert.strictEqual(manifest.fileCountExcludingManifest, manifest.files.length);

  const evolvedAfterAlpha3 = new Set([
    'VERSION',
    'scripts/test-alpha2-version-finalization.js',
    'scripts/test-alpha2-version-finalization-manifest.js',
    'scripts/verify-alpha2-next-integration-readiness.js',
    'scripts/test-alpha2-next-integration-readiness.js',
    'scripts/test-alpha3-device-key-manifest.js',
    'scripts/test-v5-documentation-status.js'
  ]);

  const seen = new Set();
  let unchangedHashChecks = 0;
  let historicalEvolvedChecks = 0;

  for (const entry of manifest.files) {
    assert.strictEqual(typeof entry.path, 'string');
    assert.strictEqual(
      seen.has(entry.path),
      false,
      `Duplikált útvonal: ${entry.path}`
    );
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(entry.bytes) && entry.bytes > 0);
    assert.strictEqual(entry.path.endsWith('/secrets.h'), false);
    assert.notStrictEqual(entry.path, '.env');

    const content = read(entry.path);
    if (evolvedAfterAlpha3.has(entry.path)) {
      historicalEvolvedChecks += 1;
    } else {
      assert.strictEqual(
        content.length,
        entry.bytes,
        `Méreteltérés: ${entry.path}`
      );
      assert.strictEqual(
        sha256(content),
        entry.sha256,
        `SHA-256 eltérés: ${entry.path}`
      );
      unchangedHashChecks += 1;
    }
    seen.add(entry.path);
  }

  for (const required of [
    '.github/workflows/tauri-artifact-build.yml',
    'VERSION',
    'fejlesztes_readme.md',
    'docs/v5/ALPHA3_HARDWARE_TEST_RUNBOOK.md',
    'docs/v5/ALPHA3_RELEASE_NOTES_DRAFT.md',
    'docs/v5/V5_IMPLEMENTATION_STATUS.md',
    'docs/v5/V5_REARCHITECTURE_CHECKLIST.md',
    'docs/v5/NEXT_V5_INTEGRATION_RUNBOOK.md',
    'scripts/test-alpha2-version-finalization.js',
    'scripts/test-alpha2-version-finalization-manifest.js',
    'scripts/verify-alpha2-next-integration-readiness.js',
    'scripts/test-alpha2-next-integration-readiness.js',
    'scripts/test-alpha3-device-key-manifest.js',
    'scripts/test-v5-documentation-status.js',
    'scripts/test-tauri-artifact-workflow.js'
  ]) {
    assert.strictEqual(
      seen.has(required),
      true,
      `Hiányzó csomagfájl: ${required}`
    );
  }

  assert.ok(unchangedHashChecks > 0);
  assert.ok(historicalEvolvedChecks > 0);

  console.log('OK: Alpha.3 történeti integrációs és finalizálási manifest');
  console.log(`OK: ${unchangedHashChecks} változatlan Alpha.3 fájl SHA-256 ellenőrizve`);
  console.log(`OK: ${historicalEvolvedChecks} Beta.1-ben fejlődött fájl történeti bejegyzése megőrizve`);
  console.log('OK: minden aktuális projektverzió 5.0.0-beta.1');
  console.log('OK: nincs main merge, produkciós deploy vagy public firmware frissítés');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
