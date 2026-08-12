#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));
const exists = (p) => fs.existsSync(path.join(root, p));
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const version = read('VERSION').trim();
const m = version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);
assert.ok(m, `Unsupported current Beta version: ${version}`);
const [, major, minor, , betaNumber] = m;
const docPrefix = major === '5' && minor === '0'
  ? `BETA${betaNumber}`
  : `V${major}${minor}_BETA${betaNumber}`;

const rv = json('release-versions.json');
assert.equal(rv.application, version);
assert.equal(rv.firmware, '5.0.0-beta.7');

for (const p of [
  'package.json',
  'desktop-tauri/package.json',
  'desktop-tauri/src-tauri/tauri.conf.json',
  'web-lxc/package.json'
]) {
  assert.equal(json(p).version, version, p);
}

for (const p of [
  'package-lock.json',
  'desktop-tauri/package-lock.json',
  'web-lxc/package-lock.json'
]) {
  if (!exists(p)) continue;
  const lock = json(p);
  assert.equal(lock.version, version, p);
  if (lock.packages && lock.packages['']) {
    assert.equal(lock.packages[''].version, version, `${p} root package`);
  }
}

const versionPattern = escapeRegex(version);

const cargoToml = read('desktop-tauri/src-tauri/Cargo.toml');
const packageStart = cargoToml.indexOf('[package]');
assert.notEqual(packageStart, -1, 'Cargo.toml [package] section missing');
const packageTail = cargoToml.slice(packageStart);
const nextSection = packageTail.slice(1).search(/\n\[[^\]]+\]/);
const packageSection = nextSection >= 0 ? packageTail.slice(0, nextSection + 1) : packageTail;
assert.match(packageSection, new RegExp(`^version\\s*=\\s*"${versionPattern}"\\s*$`, 'm'));

const cargoLock = read('desktop-tauri/src-tauri/Cargo.lock');
assert.match(
  cargoLock,
  new RegExp(`\\[\\[package\\]\\]\\s*\\nname\\s*=\\s*"arduino-led-controller"\\s*\\nversion\\s*=\\s*"${versionPattern}"`)
);

assert.equal(json('docs/api/openapi-v2.json').info.version, version);
assert.match(
  read('desktop-tauri/src/services/tauriApi.ts'),
  new RegExp(`APP_VERSION\\s*=\\s*['"]${versionPattern}['"]`)
);

const workflow = read('.github/workflows/beta-release.yml');
assert.match(workflow, new RegExp(`EXPECTED_VERSION:\\s*${versionPattern}`));
assert.match(workflow, /prerelease:\s*true/);
assert.match(workflow, /make_latest:\s*false/);
assert.ok(workflow.includes('doc_prefix'));
assert.ok(
  workflow.includes('body_path: docs/v5/${{ needs.validate.outputs.doc_prefix }}_RELEASE_NOTES.md'),
  'Current release body_path must use dynamic doc_prefix'
);

for (const p of [
  `RELEASE_NOTES_${version}.md`,
  `docs/v5/${docPrefix}_RELEASE_NOTES.md`,
  `docs/v5/${docPrefix}_INSTALLATION_GUIDE.md`,
  `docs/v5/${docPrefix}_RELEASE_CHECKLIST.md`
]) {
  assert.ok(exists(p), `Missing current release document: ${p}`);
}

const notes = read(`docs/v5/${docPrefix}_RELEASE_NOTES.md`);
assert.ok(notes.includes(version));
assert.ok(/main/i.test(notes));
assert.ok(/not modified|nem módosul/i.test(notes));
assert.ok(/Theme Engine 2\.0/i.test(notes));
assert.ok(/App Update Center 1\.0/i.test(notes));
assert.ok(/LXC/i.test(notes));

const fw = read('firmware/ArduinoLedController/ArduinoLedController.ino');
assert.ok(
  fw.includes(`#define FIRMWARE_VERSION "${rv.firmware}"`),
  'Firmware source/release manifest mismatch'
);

console.log(`V55_CURRENT_CANONICAL_VERSION_SURFACES=PASSED:${version}`);
console.log(`V55_CURRENT_WORKFLOW_DOC_CONTRACT=PASSED:${docPrefix}`);
console.log('V55_CURRENT_FIRMWARE_IMMUTABILITY_PAIRING=PASSED');
