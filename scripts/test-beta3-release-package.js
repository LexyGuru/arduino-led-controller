#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const app = '5.0.0-beta.3';
const fw = '4.3.0-beta.2';

assert.strictEqual(read('VERSION').trim(), app);
for (const p of [
  'package.json',
  'desktop-tauri/package.json',
  'desktop-tauri/src-tauri/tauri.conf.json'
]) {
  assert.strictEqual(json(p).version, app, p);
}
assert.match(read('desktop-tauri/src-tauri/Cargo.toml'), /version\s*=\s*"5\.0\.0-beta\.3"/);
assert.match(read('desktop-tauri/src-tauri/Cargo.lock'), /name\s*=\s*"arduino-led-controller"\s*\nversion\s*=\s*"5\.0\.0-beta\.3"/);
assert.strictEqual(json('docs/api/openapi-v2.json').info.version, app);
for (const p of [
  'desktop-tauri/src/api/generated/api-v2-client.ts',
  'desktop-tauri/src/api/generated/api-v2-operations.ts',
  'desktop-tauri/src/api/generated/api-v2-types.ts'
]) {
  assert.match(read(p), /OpenAPI verzió: 5\.0\.0-beta\.3/, p);
}

const workflow = read('.github/workflows/beta-release.yml');
assert.match(workflow, /EXPECTED_VERSION: 5\.0\.0-beta\.3/);
assert.match(workflow, /EXPECTED_FIRMWARE_VERSION: 4\.3\.0-beta\.2/);
assert.match(workflow, /BETA3_INSTALLATION_GUIDE\.md/);
assert.match(workflow, /BETA3_RELEASE_NOTES\.md/);
assert.match(workflow, /BETA3_RELEASE_CHECKLIST\.md/);
assert.match(workflow, /latest-beta\.json/);
assert.match(workflow, /"schemaVersion": 2/);
assert.match(workflow, /directApiVersion/);
assert.match(workflow, /\.bin\.sha256/);
assert.match(workflow, /prerelease: true/);
assert.match(workflow, /make_latest: false/);

for (const p of [
  'docs/v5/BETA3_INSTALLATION_GUIDE.md',
  'docs/v5/BETA3_RELEASE_NOTES.md',
  'docs/v5/BETA3_RELEASE_CHECKLIST.md'
]) {
  const s = read(p);
  assert.match(s, /5\.0\.0-beta\.3/);
  assert.match(s, /4\.3\.0-beta\.2/);
}

const notes = read('docs/v5/BETA3_RELEASE_NOTES.md');
for (const marker of [
  'Direct API',
  '60',
  'revision',
  'readback',
  'nem szükséges V5/Node/LXC szerver',
  'main'
]) {
  assert.ok(notes.includes(marker), `Hiányzó Beta.3 release marker: ${marker}`);
}
assert.match(read('deploy/install-beta-lxc.sh'), /5\.0\.0-beta\.3/);
assert.match(read('deploy/staging.env.example'), /RELEASE_CANDIDATE=beta\.3-gate/);
assert.match(read('deploy/staging.env.example'), /RELEASE_TARGET_VERSION=5\.0\.0-beta\.3/);
assert.match(read('CHANGELOG.md'), /5\.0\.0-beta\.3 \/ firmware 4\.3\.0-beta\.2/);
assert.doesNotMatch(read('docs/v5/BETA2_RELEASE_NOTES.md'), /5\.0\.0-beta\.3/);
assert.doesNotMatch(read('docs/v5/BETA1_RELEASE_NOTES.md'), /5\.0\.0-beta\.3/);

console.log(`OK: Beta.3 app ${app} paired with firmware ${fw}`);
console.log('OK: Direct schedule sync, release manifest v2 and latest-beta contracts');
console.log('OK: Beta.1 és Beta.2 történeti dokumentumok megőrizve');
