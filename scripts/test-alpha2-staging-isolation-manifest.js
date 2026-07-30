'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST_PATH = path.join(
  ROOT,
  'docs/v5/PACKAGE_MANIFEST_ALPHA2_STAGING_ISOLATION.json'
);
const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));

assert.strictEqual(
  manifest.package,
  'v5-alpha2-staging-isolation-readiness-hotfix-v2'
);
assert.strictEqual(manifest.schemaVersion, 1);
assert.strictEqual(manifest.targetBranch, 'feature/v5-server-modularization');
assert.ok(Array.isArray(manifest.files));
assert.ok(manifest.files.length >= 7);

const required = new Set([
  'deploy/staging.env.example',
  'deploy/install-staging-service.sh',
  'deploy/stage-alpha2-bundle.sh',
  'deploy/install-versioned-release.sh',
  'scripts/test-alpha2-staging-isolation.js',
  'scripts/test-alpha2-staging-isolation-manifest.js',
  'docs/v5/ALPHA2_STAGING_ISOLATION_HOTFIX.md'
]);
const seen = new Set();

for (const entry of manifest.files) {
  assert.strictEqual(typeof entry.path, 'string');
  assert.strictEqual(seen.has(entry.path), false, `Duplikált manifest útvonal: ${entry.path}`);
  seen.add(entry.path);
  assert.match(entry.sha256, /^[a-f0-9]{64}$/);
  assert.ok(Number.isInteger(entry.bytes) && entry.bytes > 0);

  const absolute = path.join(ROOT, entry.path);
  assert.strictEqual(fs.existsSync(absolute), true, `Hiányzó csomagfájl: ${entry.path}`);
  const content = fs.readFileSync(absolute);
  const actualSha256 = crypto.createHash('sha256').update(content).digest('hex');
  assert.strictEqual(actualSha256, entry.sha256, `SHA-256 eltérés: ${entry.path}`);
  assert.strictEqual(content.length, entry.bytes, `Méreteltérés: ${entry.path}`);
}

for (const relativePath of required) {
  assert.strictEqual(seen.has(relativePath), true, `Hiányzó kötelező manifest fájl: ${relativePath}`);
}

assert.strictEqual(
  seen.has('docs/v5/PACKAGE_MANIFEST_ALPHA2_STAGING_ISOLATION.json'),
  false,
  'A manifest nem hash-elheti önmagát.'
);

console.log('OK: alpha.2 staging isolation package manifest és SHA-256');
