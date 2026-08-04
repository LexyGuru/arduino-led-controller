#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const versions = JSON.parse(
  fs.readFileSync('release-versions.json', 'utf8')
);
const appWorkflow = fs.readFileSync(
  '.github/workflows/beta-release.yml',
  'utf8'
);
const firmwareWorkflow = fs.readFileSync(
  '.github/workflows/firmware-beta-release.yml',
  'utf8'
);

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

assert.equal(versions.application, '5.0.0-beta.6');
assert.equal(versions.firmware, '4.3.0-beta.4');
assert.equal(versions.channel, 'beta');

// Teljes alkalmazásrelease: csak alkalmazás, mobil és LXC.
assert.match(
  appWorkflow,
  new RegExp(`EXPECTED_VERSION: ${escapeRegex(versions.application)}`)
);
assert.match(appWorkflow, /next\/v5-rearchitecture/);
assert.match(appWorkflow, /workflow_dispatch:/);
assert.doesNotMatch(appWorkflow, /\n  push:/);
assert.match(appWorkflow, /npm test/);
assert.match(appWorkflow, /validate-repository\.sh/);
assert.match(appWorkflow, /prerelease: true/);
assert.match(appWorkflow, /make_latest: false/);
assert.match(appWorkflow, /Enforce application-only release assets/);

assert.doesNotMatch(appWorkflow, /EXPECTED_FIRMWARE_VERSION:/);
assert.doesNotMatch(appWorkflow, /build-firmware:/);
assert.doesNotMatch(appWorkflow, /UNO R4 WiFi firmware/);
assert.doesNotMatch(
  appWorkflow,
  /Arduino_LED_Controller_Firmware_.*UNO_R4_WiFi/
);

// Dedikált firmware workflow: a verzió nincs fixen beégetve.
// Három hiteles forrásból olvassa ki és egyezést követel.
assert.match(
  firmwareWorkflow,
  /FIRMWARE_RELEASE_TAG: Arduino_LED_Controller_Firmware_BETA/
);
assert.match(
  firmwareWorkflow,
  /FW_VERSION="\$\(node -p "require\('\.\/release-versions\.json'\)\.firmware"\)"/
);
assert.match(
  firmwareWorkflow,
  /SOURCE_VERSION="\$\(sed -nE .*FIRMWARE_VERSION.*ArduinoLedController\.ino/
);
assert.match(
  firmwareWorkflow,
  /META_VERSION="\$\(node -p "require\('\.\/firmware\/firmware-release\.json'\)\.firmwareVersion"\)"/
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

assert.match(firmwareWorkflow, /Build UNO R4 WiFi firmware/);
assert.match(firmwareWorkflow, /firmware-catalog\.json/);
assert.match(firmwareWorkflow, /FIRMWARE-SHA256SUMS/);
assert.match(
  firmwareWorkflow,
  /Migrate verified legacy firmware assets/
);
assert.match(
  firmwareWorkflow,
  /Remove firmware assets from application releases after migration/
);

assert.doesNotMatch(firmwareWorkflow, /build-desktop:/);
assert.doesNotMatch(firmwareWorkflow, /build-android:/);
assert.doesNotMatch(firmwareWorkflow, /build-ios:/);
assert.doesNotMatch(firmwareWorkflow, /build-lxc:/);

assert.doesNotMatch(appWorkflow, /firmware-latest/);
assert.doesNotMatch(appWorkflow, /4\.1\.21/);
assert.doesNotMatch(
  appWorkflow,
  /EXPECTED_VERSION: 5\.0\.0-beta\.3/
);

console.log(
  `OK: alkalmazásrelease ${versions.application} és dinamikus dedikált firmware ${versions.firmware} workflow contract`
);
