'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const release = JSON.parse(
  fs.readFileSync('release-versions.json', 'utf8')
);
const firmware = fs.readFileSync(
  'firmware/ArduinoLedController/ArduinoLedController.ino',
  'utf8'
);
const firmwareRelease = JSON.parse(
  fs.readFileSync('firmware/firmware-release.json', 'utf8')
);
const currentState = fs.readFileSync(
  'docs/v5/CURRENT_STATE.md',
  'utf8'
);
const readme = fs.readFileSync(
  'README.md',
  'utf8'
);
const panel = fs.readFileSync(
  'desktop-tauri/src/components/v55/DiagnosticsPanel.tsx',
  'utf8'
);

assert.equal(release.application, '5.8.0-beta.3');
assert.equal(release.firmware, '5.1.0-beta.3');
assert.equal(
  release.firmwareRelease.recommendedVersion,
  '5.1.0-beta.3'
);
assert.equal(release.directApi, '1.1.0');
assert.equal(
  release.directApiRelease.version,
  '1.1.0'
);

assert.ok(
  firmware.includes(
    '#define FIRMWARE_VERSION "5.1.0-beta.3"'
  )
);
assert.ok(
  firmware.includes(
    '#define DIRECT_API_VERSION "1.1.0"'
  )
);

assert.equal(
  firmwareRelease.firmwareVersion,
  '5.1.0-beta.3'
);
assert.equal(
  firmwareRelease.directApiVersion,
  '1.1.0'
);

for (const source of [currentState, readme]) {
  assert.ok(
    source.includes(
      'Current firmware: `5.1.0-beta.3`'
    )
  );
  assert.ok(
    source.includes(
      'Current Direct API: `1.1.0`'
    )
  );
}

for (const marker of [
  'bootEpoch: string | null;',
  'data-diagnostics-window-health=',
  'Polling governor',
]) {
  assert.ok(panel.includes(marker), marker);
}

console.log('V796_FIRMWARE_5_1_0_BETA3_SSOT=PASSED');
console.log('V796_FIRMWARE_METADATA_PARITY=PASSED');
console.log('V796_DIRECT_API_1_1_PRESERVED=PASSED');
console.log('V796_CURRENT_DOCS_VERSION_SYNC=PASSED');
console.log('V796_V795_DIAGNOSTICS_STACK_PRESERVED=PASSED');
console.log('V796_FIRMWARE_BETA3_BUILD_CONTRACT=PASSED');
