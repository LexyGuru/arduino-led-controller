#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));

const versions = json('release-versions.json');
const firmware = json('firmware/firmware-release.json');
const workflow = read('.github/workflows/beta-release.yml');

assert.equal(versions.application, '5.0.0-beta.6');
assert.equal(versions.firmware, '4.3.0-beta.4');
assert.equal(versions.directApi, '1.0.0');
assert.equal(versions.channel, 'beta');

assert.equal(firmware.firmwareVersion, '4.3.0-beta.4');
assert.equal(firmware.directApiVersion, '1.0.0');
assert.equal(firmware.channel, 'beta');

for (const file of [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'docs/v5/BETA6_INSTALLATION_GUIDE.md',
  'docs/v5/BETA6_RELEASE_NOTES.md',
  'docs/v5/BETA6_RELEASE_CHECKLIST.md'
]) {
  assert.ok(fs.existsSync(file), `Hiányzó Beta.6 dokumentum: ${file}`);
}

for (const token of [
  '5.0.0-beta.6',
  '4.3.0-beta.4',
  'BETA6_INSTALLATION_GUIDE.md',
  'BETA6_RELEASE_NOTES.md',
  'BETA6_RELEASE_CHECKLIST.md',
  'prerelease: true',
  'make_latest: false'
]) {
  assert.ok(workflow.includes(token), `Hiányzó workflow marker: ${token}`);
}

assert.match(read('README.md'), /magyar.*angol.*német/is);
assert.match(read('CONTRIBUTING.md'), /useI18n\(\)/);
assert.match(read('CONTRIBUTING.md'), /translate\(\)/);
assert.match(read('SECURITY.md'), /X-Device-Key/);
assert.match(read('SECURITY.md'), /Keychain/);
assert.match(read('CHANGELOG.md'), /Firmware-katalógus|workflow/i);

assert.doesNotMatch(workflow, /EXPECTED_VERSION: 5\.0\.0-beta\.4/);
assert.doesNotMatch(read('VERSION'), /5\.0\.0-beta\.4/);

console.log(
  'OK: 5.0.0-beta.6 firmware-katalógus és release workflow contract'
);
