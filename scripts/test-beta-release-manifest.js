#!/usr/bin/env node
'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const manifestPath = path.join(
  root,
  'docs/v5/PACKAGE_MANIFEST_BETA1_DISTRIBUTION.json'
);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

assert.strictEqual(manifest.schemaVersion, 1);
assert.strictEqual(manifest.package, 'v5-beta1-distribution-v13.4');
assert.strictEqual(
  manifest.baseCommit,
  'aca96f9d01d0d926f2643f4e48fd2bce5945b33a'
);
assert.strictEqual(manifest.targetBranch, 'next/v5-rearchitecture');
assert.strictEqual(manifest.applicationVersionBefore, '5.0.0-alpha.3');
assert.strictEqual(manifest.applicationVersionAfter, '5.0.0-beta.1');
assert.strictEqual(manifest.firmwareVersion, '4.1.21');
assert.strictEqual(manifest.releaseTag, 'v5.0.0-beta.1');
assert.strictEqual(manifest.releaseWorkflow, '.github/workflows/beta-release.yml');
assert.strictEqual(manifest.manualDispatchOnly, false);
assert.strictEqual(manifest.initialPublicationTrigger, 'guarded-push');
assert.strictEqual(manifest.pushTriggerBranch, 'next/v5-rearchitecture');
assert.deepStrictEqual(manifest.pushTriggerPaths, [
  '.github/workflows/beta-release.yml',
  'docs/v5/PACKAGE_MANIFEST_BETA1_DISTRIBUTION.json'
]);
assert.strictEqual(manifest.githubPrerelease, true);
assert.strictEqual(manifest.makeLatest, false);
assert.strictEqual(manifest.publicBetaReleaseIncluded, true);
assert.strictEqual(manifest.mainMergeIncluded, false);
assert.strictEqual(manifest.productionDeploymentIncluded, false);
assert.strictEqual(manifest.publicFirmwareLatestUpdated, false);
assert.strictEqual(manifest.productionArduinoUpdated, false);
assert.strictEqual(manifest.queryFallbackEnabled, true);
assert.strictEqual(manifest.arduinoResponseTimeoutMs, 30000);
assert.strictEqual(manifest.tauriConnectTimeoutMs, 5000);
assert.strictEqual(manifest.tauriResponseTimeoutMs, 30000);

const platformIds = manifest.platforms.map((entry) => entry.id).sort();
assert.deepStrictEqual(platformIds, [
  'android',
  'firmware-uno-r4-wifi',
  'ios-ipados',
  'linux-x86_64',
  'lxc-server',
  'macos-apple-silicon',
  'macos-intel',
  'windows-x86_64'
]);

for (const platform of manifest.platforms) {
  assert.ok(Array.isArray(platform.assets) && platform.assets.length > 0);
  assert.strictEqual(typeof platform.installable, 'boolean');
}

assert.strictEqual(manifest.supplyChain.sha256Sums, true);
assert.strictEqual(manifest.supplyChain.releaseManifest, true);
assert.strictEqual(manifest.supplyChain.cycloneDxSbom, true);
assert.strictEqual(manifest.supplyChain.provenance, true);
assert.strictEqual(manifest.supplyChain.secretScan, true);

assert.strictEqual(manifest.signing.windowsCodeSigned, false);
assert.strictEqual(manifest.signing.macDeveloperIdSigned, false);
assert.strictEqual(manifest.signing.macNotarized, false);
assert.strictEqual(manifest.signing.iosSigned, false);
assert.strictEqual(manifest.signing.androidSignedWhenSecretsAvailable, true);

const files = manifest.files;
assert.strictEqual(files.length, manifest.fileCountExcludingManifest);
assert.strictEqual(manifest.fileCountExcludingManifest, 22);

const expectedPaths = [
  '.github/workflows/beta-release.yml',
  'VERSION',
  'deploy/beta-lxc.env.example',
  'deploy/build-beta-release-bundle.sh',
  'deploy/install-beta-lxc.sh',
  'deploy/install-staging-service.sh',
  'deploy/verify-versioned-release.sh',
  'deploy/staging.env.example',
  'deploy/systemd/arduino-led-controller-staging.service',
  'docs/v5/BETA1_INSTALLATION_GUIDE.md',
  'docs/v5/BETA1_RELEASE_CHECKLIST.md',
  'docs/v5/BETA1_RELEASE_NOTES.md',
  'scripts/test-alpha2-next-integration-readiness.js',
  'scripts/test-alpha2-release-gate.js',
  'scripts/test-alpha2-version-finalization-manifest.js',
  'scripts/test-alpha2-version-finalization.js',
  'scripts/test-alpha3-device-key-manifest.js',
  'scripts/test-beta-installation-assets.js',
  'scripts/test-beta-release-manifest.js',
  'scripts/test-beta-release-workflow.js',
  'scripts/test-v5-documentation-status.js',
  'scripts/verify-alpha2-next-integration-readiness.js'
].sort();

assert.deepStrictEqual(
  files.map((entry) => entry.path).sort(),
  expectedPaths
);

for (const entry of files) {
  const absolutePath = path.join(root, entry.path);
  const content = fs.readFileSync(absolutePath);
  const digest = crypto.createHash('sha256').update(content).digest('hex');
  assert.strictEqual(content.length, entry.bytes, `Méreteltérés: ${entry.path}`);
  assert.strictEqual(digest, entry.sha256, `SHA-256 eltérés: ${entry.path}`);
}

if (process.env.BETA_MANIFEST_ONLY !== '1') {
  const expectedVersion = '5.0.0-beta.1';
  const textVersion = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  assert.strictEqual(textVersion, expectedVersion);

  const rootPackage = JSON.parse(
    fs.readFileSync(path.join(root, 'package.json'), 'utf8')
  );
  const desktopPackage = JSON.parse(
    fs.readFileSync(path.join(root, 'desktop-tauri/package.json'), 'utf8')
  );
  const tauriConfig = JSON.parse(
    fs.readFileSync(path.join(root, 'desktop-tauri/src-tauri/tauri.conf.json'), 'utf8')
  );
  const openapi = JSON.parse(
    fs.readFileSync(path.join(root, 'docs/api/openapi-v2.json'), 'utf8')
  );
  const cargoToml = fs.readFileSync(
    path.join(root, 'desktop-tauri/src-tauri/Cargo.toml'),
    'utf8'
  );
  const cargoLock = fs.readFileSync(
    path.join(root, 'desktop-tauri/src-tauri/Cargo.lock'),
    'utf8'
  );

  assert.strictEqual(rootPackage.version, expectedVersion);
  assert.strictEqual(desktopPackage.version, expectedVersion);
  assert.strictEqual(tauriConfig.version, expectedVersion);
  assert.strictEqual(openapi.info.version, expectedVersion);
  assert.match(
    cargoToml,
    /\[package\][\s\S]*?^version\s*=\s*"5\.0\.0-beta\.1"/m
  );
  assert.match(
    cargoLock,
    /\[\[package\]\]\s+name = "arduino-led-controller"\s+version = "5\.0\.0-beta\.1"/
  );
}

console.log('OK: V13.4 Beta.1 distribution package manifest és SHA-256');
console.log('OK: történeti Alpha.2/Alpha.3 tesztek Beta.1-kompatibilisek');
console.log('OK: minden telepítési platform és supply-chain evidence deklarálva');
console.log('OK: nincs main merge, produkciós deploy vagy firmware-latest frissítés');
