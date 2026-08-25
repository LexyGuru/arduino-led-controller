#!/usr/bin/env node
const fs = require('fs');
'use strict';

const assert = require('node:assert/strict');
const CURRENT_APP_VERSION_FROM_VERSION = fs.readFileSync('VERSION', 'utf8').trim();
const CURRENT_FIRMWARE_VERSION_FROM_METADATA = JSON.parse(
  fs.readFileSync('firmware/firmware-release.json', 'utf8'),
).firmwareVersion;

const read = (file) => fs.readFileSync(file, 'utf8');
const json = (file) => JSON.parse(read(file));

const versions = json('release-versions.json');
const firmware = json('firmware/firmware-release.json');
const firmwareSource = read(
  'firmware/ArduinoLedController/ArduinoLedController.ino',
);
const appWorkflow = read('.github/workflows/beta-release.yml');
const firmwareWorkflow = read(
  '.github/workflows/firmware-beta-release.yml',
);

assert.equal(versions.application, CURRENT_APP_VERSION_FROM_VERSION);
assert.match(versions.firmware, /^\d+\.\d+\.\d+-beta\.\d+$/);
assert.match(versions.directApi, /^\d+\.\d+\.\d+$/);
assert.equal(versions.channel, 'beta');

assert.equal(firmware.firmwareVersion, versions.firmware);
assert.equal(firmware.directApiVersion, versions.directApi);

const currentReadme = read('README.md');
assert.ok(
  currentReadme.includes(versions.application),
  'README.md: current application version',
);
assert.ok(
  currentReadme.includes(versions.firmware),
  'README.md: current firmware version',
);
assert.ok(
  currentReadme.includes(versions.directApi),
  'README.md: current Direct API version',
);

for (const file of [
  'docs/v5/BETA6_RELEASE_NOTES.md',
  'docs/v5/BETA6_INSTALLATION_GUIDE.md',
  'docs/v5/BETA6_RELEASE_CHECKLIST.md',
]) {
  const content = read(file);
  assert.ok(content.includes('5.0.0-beta.6'), `${file}: historical application version`);
  assert.ok(content.includes('4.3.0-beta.6'), `${file}: historical firmware version`);
  assert.ok(content.includes('1.1.0'), `${file}: historical Direct API version`);
}

assert.equal(firmware.channel, versions.channel);
assert.ok(
  firmwareSource.includes(
    `#define FIRMWARE_VERSION "${versions.firmware}"`,
  ),
  'A firmware forrásverzió nem egyezik a központi verzióval',
);
assert.ok(
  firmwareSource.includes(
    `#define DIRECT_API_VERSION "${versions.directApi}"`,
  ),
  'A Direct API forrásverzió nem egyezik a központi verzióval',
);

for (const file of [
  'README.md',
  'CONTRIBUTING.md',
  'SECURITY.md',
  'CHANGELOG.md',
  'docs/v5/BETA6_INSTALLATION_GUIDE.md',
  'docs/v5/BETA6_RELEASE_NOTES.md',
  'docs/v5/BETA6_RELEASE_CHECKLIST.md',
]) {
  assert.ok(
    fs.existsSync(file),
    `Hiányzó Beta.6 dokumentum: ${file}`,
  );
}

// Az alkalmazásrelease kizárólag a Beta.6 alkalmazáscsomagot kezeli.
// A jelenlegi alkalmazás-workflow current release contract.
// A történeti BETA6_* dokumentumokat külön, fentebb ellenőrizzük.
for (const token of [
  versions.application,
  'prerelease: true',
  'make_latest: false',
  'Enforce application-only release assets',
]) {
  assert.ok(
    appWorkflow.includes(token),
    `Hiányzó current alkalmazás-workflow marker: ${token}`,
  );
}

assert.doesNotMatch(appWorkflow, /EXPECTED_FIRMWARE_VERSION:/);
assert.doesNotMatch(appWorkflow, /build-firmware:/);
assert.doesNotMatch(appWorkflow, /UNO R4 WiFi firmware/);
assert.doesNotMatch(
  appWorkflow,
  /Arduino_LED_Controller_Firmware_.*UNO_R4_WiFi/,
);

// A firmware külön, állandó többverziós Beta release-be kerül.
for (const token of [
  'Arduino_LED_Controller_Firmware_BETA',
  'firmware-catalog.json',
  'FIRMWARE-SHA256SUMS',
  'Build UNO R4 WiFi firmware',
  'Migrate verified legacy firmware assets',
  'Remove firmware assets from application releases after migration',
  'API_VERSION=',
  'SOURCE_API_VERSION=',
  'META_API_VERSION=',
  'npm run test:ntp-timezone-contract',
]) {
  assert.ok(
    firmwareWorkflow.includes(token),
    `Hiányzó firmware-workflow marker: ${token}`,
  );
}

assert.match(
  firmwareWorkflow,
  /require\('\.\/release-versions\.json'\)\.firmware/,
);
assert.match(
  firmwareWorkflow,
  /require\('\.\/release-versions\.json'\)\.directApi/,
);
assert.match(
  firmwareWorkflow,
  /FIRMWARE_VERSION.*ArduinoLedController\.ino/,
);
assert.match(
  firmwareWorkflow,
  /DIRECT_API_VERSION.*ArduinoLedController\.ino/,
);
assert.match(
  firmwareWorkflow,
  /require\('\.\/firmware\/firmware-release\.json'\)\.firmwareVersion/,
);
assert.match(
  firmwareWorkflow,
  /require\('\.\/firmware\/firmware-release\.json'\)\.directApiVersion/,
);
assert.match(
  firmwareWorkflow,
  /test "\$\{FW_VERSION\}" = "\$\{SOURCE_VERSION\}"/,
);
assert.match(
  firmwareWorkflow,
  /test "\$\{FW_VERSION\}" = "\$\{META_VERSION\}"/,
);
assert.match(
  firmwareWorkflow,
  /test "\$\{API_VERSION\}" = "\$\{SOURCE_API_VERSION\}"/,
);
assert.match(
  firmwareWorkflow,
  /test "\$\{API_VERSION\}" = "\$\{META_API_VERSION\}"/,
);
assert.match(
  firmwareWorkflow,
  /Arduino_LED_Controller_Firmware_\$\{FW_VERSION\}_UNO_R4_WiFi\.bin/,
);

assert.match(read('README.md'), /magyar.*angol.*német/is);
assert.match(read('CONTRIBUTING.md'), /useI18n\(\)/);
assert.match(read('CONTRIBUTING.md'), /translate\(\)/);
assert.match(read('SECURITY.md'), /X-Device-Key/);
assert.match(read('SECURITY.md'), /Keychain/);
assert.match(
  read('CHANGELOG.md'),
  /Firmware-katalógus|workflow/i,
);

assert.doesNotMatch(
  appWorkflow,
  /EXPECTED_VERSION: 5\.0\.0-beta\.4/,
);
assert.doesNotMatch(read('VERSION'), /5\.0\.0-beta\.4/);

console.log(
  `OK: ${versions.application} alkalmazásrelease, firmware ${versions.firmware}, Direct API ${versions.directApi} contract`,
);
