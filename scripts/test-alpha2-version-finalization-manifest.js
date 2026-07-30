'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(
  ROOT,
  'docs/v5/PACKAGE_MANIFEST_ALPHA2_VERSION_FINALIZATION.json'
);

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function main() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

  assert.strictEqual(
    manifest.package,
    'v5-alpha2-finalization-next-integration-readiness-v3'
  );
  assert.strictEqual(manifest.schemaVersion, 1);
  assert.strictEqual(manifest.sourceVersion, '5.0.0-alpha.1');
  assert.strictEqual(manifest.targetVersion, '5.0.0-alpha.2');
  assert.strictEqual(
    manifest.candidateCommit,
    '1236becc37e9b4d8ed2334f3cd60b455c248e82d'
  );
  assert.strictEqual(
    manifest.targetBranch,
    'feature/v5-server-modularization'
  );
  assert.strictEqual(manifest.runtimeCodeChanged, false);
  assert.strictEqual(manifest.generatedClientMetadataChanged, true);
  assert.ok(Array.isArray(manifest.files));
  assert.strictEqual(manifest.fileCountExcludingManifest, manifest.files.length);
  assert.ok(manifest.files.length >= 33);

  const seen = new Set();
  const required = new Set([
    'VERSION',
    'package.json',
    'package-lock.json',
    'desktop-tauri/package.json',
    'desktop-tauri/package-lock.json',
    'desktop-tauri/src-tauri/Cargo.toml',
    'desktop-tauri/src-tauri/Cargo.lock',
    'desktop-tauri/src-tauri/tauri.conf.json',
    'docs/api/openapi-v2.json',
    'desktop-tauri/src/api/generated/api-v2-types.ts',
    'desktop-tauri/src/api/generated/api-v2-operations.ts',
    'desktop-tauri/src/api/generated/api-v2-client.ts',
    'docs/v5/V5_REARCHITECTURE_CHECKLIST.md',
    'docs/v5/ALPHA2_RELEASE_NOTES.md',
    'docs/v5/ALPHA2_MIGRATION.md',
    'docs/v5/ALPHA2_VERSION_FINALIZATION.md',
    'scripts/check-versions.py',
    'scripts/test-alpha2-version-finalization.js',
    'scripts/test-alpha2-version-finalization-manifest.js',
    'docs/v5/V5_IMPLEMENTATION_STATUS.md',
    'docs/v5/NEXT_V5_INTEGRATION_RUNBOOK.md',
    'fejlesztes_readme.md',
    'scripts/verify-alpha2-next-integration-readiness.js',
    'scripts/test-alpha2-next-integration-readiness.js',
    'scripts/test-v5-documentation-status.js',
  ]);

  for (const entry of manifest.files) {
    assert.strictEqual(typeof entry.path, 'string');
    assert.strictEqual(seen.has(entry.path), false, `Duplikált útvonal: ${entry.path}`);
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    assert.ok(Number.isInteger(entry.bytes) && entry.bytes > 0);

    assert.strictEqual(
      entry.path.startsWith('server/'),
      false,
      `Runtime szerverfájl nem kerülhet a finalizáló csomagba: ${entry.path}`
    );
    assert.strictEqual(
      entry.path.startsWith('deploy/'),
      false,
      `Telepítő runtime fájl nem kerülhet a finalizáló csomagba: ${entry.path}`
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
    seen.has('docs/v5/PACKAGE_MANIFEST_ALPHA2_VERSION_FINALIZATION.json'),
    false,
    'A manifest nem hash-elheti önmagát.'
  );

  console.log('OK: Alpha.2 verziófinalizáló manifest és SHA-256');
  console.log('OK: a finalizáló csomag nem tartalmaz runtime szerver- vagy deploy-kódot');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
