#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const cp = require('node:child_process');
const fs = require('node:fs');
const versions = JSON.parse(fs.readFileSync('release-versions.json', 'utf8'));
const __v774AppBeta = /-beta\.\d+$/.test(versions.application);
const __v774FirmwareBeta = /-beta\.\d+$/.test(versions.firmware);
const release = JSON.parse(fs.readFileSync('firmware/firmware-release.json', 'utf8'));
const __v774FirmwareMetaBeta = /-beta\.\d+$/.test(release.firmwareVersion);
const deviceTest = fs.readFileSync('scripts/test-alpha3-device-key-header.js', 'utf8');

function validFirmwareVersion(version, channel) {
  if (channel === 'stable') return /^\d+\.\d+\.\d+$/.test(version);
  if (channel === 'beta') return /^\d+\.\d+\.\d+-beta\.\d+$/.test(version);
  return false;
}

assert.ok(['stable', 'beta'].includes(versions.firmwareRelease?.channel));
assert.equal(release.channel, versions.firmwareRelease.channel);
assert.ok(validFirmwareVersion(versions.firmware, versions.firmwareRelease.channel));

for (const [version, channel, expected] of [
  ['5.0.0', 'stable', true],
  ['5.0.0-beta.10', 'beta', true],
  ['5.0.0', 'beta', false],
  ['5.0.0-beta.10', 'stable', false],
  ['5.0.0-rc.1', 'stable', false],
  ['5.0.0-rc.1', 'beta', false],
]) {
  assert.equal(validFirmwareVersion(version, channel), expected);
}

for (const token of [
  'const firmwareChannel =',
  "firmwareChannel === 'stable' || firmwareChannel === 'beta'",
  "if (firmwareChannel === 'stable')",
  'versions.firmwareRelease?.channel',
  'release.channel',
]) {
  assert.ok(deviceTest.includes(token), `Missing channel-aware token: ${token}`);
}

cp.execFileSync(process.execPath, ['scripts/test-alpha3-device-key-header.js'], { stdio: 'inherit' });
console.log(`FIRMWARE_DEVICE_KEY_CHANNEL_AWARE=PASSED:${versions.firmwareRelease.channel}`);
console.log('FIRMWARE_CHANNEL_CROSSOVER_REJECTED=PASSED');
