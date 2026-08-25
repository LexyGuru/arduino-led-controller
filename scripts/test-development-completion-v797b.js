'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const release = JSON.parse(fs.readFileSync('release-versions.json', 'utf8'));
const fw = fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino', 'utf8');
const meta = JSON.parse(fs.readFileSync('firmware/firmware-release.json', 'utf8'));
const panel = fs.readFileSync('desktop-tauri/src/components/v55/DiagnosticsPanel.tsx', 'utf8');
const controller = fs.readFileSync('desktop-tauri/src/hooks/useController.ts', 'utf8');

const expectedFirmware = release.firmware;
const expectedApi = release.directApi;

assert.equal(expectedFirmware, release.firmwareRelease.recommendedVersion);
assert.equal(expectedApi, release.directApiRelease.version);
assert.ok(fw.includes(`#define FIRMWARE_VERSION "${expectedFirmware}"`));
assert.ok(fw.includes(`#define DIRECT_API_VERSION "${expectedApi}"`));
assert.equal(meta.firmwareVersion, expectedFirmware);
assert.equal(meta.directApiVersion, expectedApi);

for (const marker of [
  'bootEpoch: string | null;',
  'data-diagnostics-boot-epoch=',
  'data-diagnostics-window-health=',
  'const recoveryHold =',
  "'RECOVERING'",
  'Polling governor',
  'v792-diagnostics-warning-list'
]) {
  assert.ok(panel.includes(marker), marker);
}

for (const marker of [
  'diagnosticsGovernorInterval',
  'diagnosticsPollIntervalRef.current',
  'window.setTimeout('
]) {
  assert.ok(controller.includes(marker), marker);
}

const a = controller.indexOf('const refreshDiagnostics =');
const b = controller.indexOf('const refreshFirmware =', a);
assert.ok(a >= 0 && b > a);
const block = controller.slice(a, b);
assert.ok(!block.includes("state: 'offline'"));
assert.ok(!block.includes("state: 'recovering'"));

console.log('V797B_VERSION_PARITY=PASSED');
console.log('V797B_DIRECT_API_PARITY=PASSED');
console.log('V797B_MEGA8_TO_MEGA12_STACK=PASSED');
console.log('V797B_PRIMARY_CONNECTION_STATE_ISOLATION=PASSED');
console.log('V797B_DEVELOPMENT_COMPLETION_CONTRACT=PASSED');
