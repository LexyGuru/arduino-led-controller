#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const full = fs.readFileSync(
  '.github/workflows/beta-release.yml',
  'utf8'
);
const fw = fs.readFileSync(
  '.github/workflows/firmware-beta-release.yml',
  'utf8'
);

assert.doesNotMatch(full, /build-firmware:/);
assert.doesNotMatch(
  full,
  /Arduino_LED_Controller_Firmware_.*UNO_R4_WiFi/
);
assert.match(
  full,
  /Enforce application-only release assets/
);

for (const job of [
  'build-desktop:',
  'build-android:',
  'build-ios:',
  'build-lxc:',
  'publish:'
]) {
  assert.match(full, new RegExp(job));
}

assert.match(
  fw,
  /FIRMWARE_RELEASE_TAG: Arduino_LED_Controller_Firmware_BETA/
);
assert.match(fw, /Migrate verified legacy firmware assets/);
assert.match(fw, /Generate authoritative firmware catalog/);
assert.match(
  fw,
  /Remove firmware assets from application releases after migration/
);
assert.match(
  fw,
  /Preserve immutable published firmware assets/
);
assert.match(fw, /IMMUTABLE_EXISTING_ASSET_PRESERVED/);
assert.match(fw, /REBUILD_DRIFT_DETECTED/);
assert.match(fw, /published_sha/);
assert.match(fw, /expected_published_sha/);
assert.match(fw, /firmware-catalog\.json/);
assert.match(fw, /FIRMWARE-SHA256SUMS/);
assert.doesNotMatch(fw, /build-desktop:/);

// Cleanup must use the numeric REST asset id, never a gh GraphQL
// formatting field such as databaseId.
assert.doesNotMatch(fw, /databaseId/);
assert.match(
  fw,
  /releases\/\$\{release_id\}\/assets\?per_page=100/
);
assert.match(fw, /\[\s*\.name,\s*\.id\s*\]\s*\|\s*@tsv/);
assert.match(fw, /test "\$\{asset_id\}" -gt 0/);
assert.match(
  fw,
  /releases\/assets\/\$\{asset_id\}/
);

console.log(
  'OK: alkalmazásrelease és dedikált többverziós firmware BETA release teljes szétválasztása'
);
console.log(
  'OK: legacy firmware asset cleanup valódi REST asset_id alapján'
);
