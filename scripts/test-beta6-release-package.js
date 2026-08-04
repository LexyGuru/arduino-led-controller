#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));

const versions = json('release-versions.json');
const firmware = json('firmware/firmware-release.json');
const appWorkflow = read('.github/workflows/beta-release.yml');
const firmwareWorkflow = read(
  '.github/workflows/firmware-beta-release.yml'
);

assert.equal(versions.application, '5.0.0-beta.6');
assert.equal(versions.firmware, '4.3.0-beta.5');
assert.equal(versions.directApi, '1.0.0');
assert.equal(versions.channel, 'beta');

assert.equal(firmware.firmwareVersion, versions.firmware);
assert.equal(firmware.directApiVersion, versions.directApi);
assert.equal(firmware.channel, versions.channel);

for (const file of [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'docs/v5/BETA6_INSTALLATION_GUIDE.md',
  'docs/v5/BETA6_RELEASE_NOTES.md',
  'docs/v5/BETA6_RELEASE_CHECKLIST.md'
]) {
  assert.ok(
    fs.existsSync(file),
    `Hiányzó Beta.6 dokumentum: ${file}`
  );
}

// Az alkalmazásrelease kizárólag a Beta.6 alkalmazáscsomagot kezeli.
for (const token of [
  '5.0.0-beta.6',
  'BETA6_INSTALLATION_GUIDE.md',
  'BETA6_RELEASE_NOTES.md',
  'BETA6_RELEASE_CHECKLIST.md',
  'prerelease: true',
  'make_latest: false',
  'Enforce application-only release assets'
]) {
  assert.ok(
    appWorkflow.includes(token),
    `Hiányzó alkalmazás-workflow marker: ${token}`
  );
}

assert.doesNotMatch(appWorkflow, /EXPECTED_FIRMWARE_VERSION:/);
assert.doesNotMatch(appWorkflow, /build-firmware:/);
assert.doesNotMatch(appWorkflow, /UNO R4 WiFi firmware/);
assert.doesNotMatch(
  appWorkflow,
  /Arduino_LED_Controller_Firmware_.*UNO_R4_WiFi/
);

// A firmware külön, állandó többverziós Beta release-be kerül.
for (const token of [
  'Arduino_LED_Controller_Firmware_BETA',
  'firmware-catalog.json',
  'FIRMWARE-SHA256SUMS',
  'Build UNO R4 WiFi firmware',
  'Migrate verified legacy firmware assets',
  'Remove firmware assets from application releases after migration'
]) {
  assert.ok(
    firmwareWorkflow.includes(token),
    `Hiányzó firmware-workflow marker: ${token}`
  );
}

// A firmware-verzió nincs a workflow-ba fixen beégetve.
// A workflow a három hivatalos forrás egyezését ellenőrzi.
assert.match(
  firmwareWorkflow,
  /require\('\.\/release-versions\.json'\)\.firmware/
);
assert.match(
  firmwareWorkflow,
  /FIRMWARE_VERSION.*ArduinoLedController\.ino/
);
assert.match(
  firmwareWorkflow,
  /require\('\.\/firmware\/firmware-release\.json'\)\.firmwareVersion/
);
assert.match(
  firmwareWorkflow,
  /test "\$\{FW_VERSION\}" = "\$\{SOURCE_VERSION\}"/
);
assert.match(
  firmwareWorkflow,
  /test "\$\{FW_VERSION\}" = "\$\{META_VERSION\}"/
);
assert.match(
  firmwareWorkflow,
  /Arduino_LED_Controller_Firmware_\$\{FW_VERSION\}_UNO_R4_WiFi\.bin/
);

assert.match(read('README.md'), /magyar.*angol.*német/is);
assert.match(read('CONTRIBUTING.md'), /useI18n\(\)/);
assert.match(read('CONTRIBUTING.md'), /translate\(\)/);
assert.match(read('SECURITY.md'), /X-Device-Key/);
assert.match(read('SECURITY.md'), /Keychain/);
assert.match(
  read('CHANGELOG.md'),
  /Firmware-katalógus|workflow/i
);

assert.doesNotMatch(
  appWorkflow,
  /EXPECTED_VERSION: 5\.0\.0-beta\.4/
);
assert.doesNotMatch(read('VERSION'), /5\.0\.0-beta\.4/);

console.log(
  'OK: 5.0.0-beta.6 alkalmazásrelease és dedikált többverziós firmware BETA release contract'
);
