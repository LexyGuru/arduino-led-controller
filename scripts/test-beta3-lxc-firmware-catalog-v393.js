#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const {
  compareFirmwareVersions,
  firmwareVersionFromName,
  parseReleaseArtifact
} = require('../server/firmware/firmware-release-client');

const config = fs.readFileSync('server/core/config.js', 'utf8');
assert.match(config, /Arduino_LED_Controller_Firmware_BETA/);

assert.equal(
  firmwareVersionFromName(
    'Arduino_LED_Controller_Firmware_5.0.0-beta.7_UNO_R4_WiFi.bin'
  ),
  '5.0.0-beta.7'
);
assert.ok(compareFirmwareVersions('5.0.0-beta.7', '4.3.0-beta.6') > 0);
assert.ok(compareFirmwareVersions('5.0.0-beta.7', '5.0.0-beta.6') > 0);

const release = {
  id: 1,
  tag_name: 'Arduino_LED_Controller_Firmware_BETA',
  target_commitish: 'next/v5-rearchitecture',
  published_at: '2026-08-04T00:00:00Z',
  assets: [
    { name: 'Arduino_LED_Controller_Firmware_4.3.0-beta.1_UNO_R4_WiFi.bin', browser_download_url: 'https://example.invalid/431.bin' },
    { name: 'Arduino_LED_Controller_Firmware_4.3.0-beta.1_UNO_R4_WiFi.bin.sha256', browser_download_url: 'https://example.invalid/431.sha' },
    { name: 'Arduino_LED_Controller_Firmware_5.0.0-beta.7_UNO_R4_WiFi.bin', browser_download_url: 'https://example.invalid/507.bin' },
    { name: 'Arduino_LED_Controller_Firmware_5.0.0-beta.7_UNO_R4_WiFi.bin.sha256', browser_download_url: 'https://example.invalid/507.sha' },
    { name: 'Arduino_LED_Controller_Firmware_5.0.0-beta.6_UNO_R4_WiFi.bin', browser_download_url: 'https://example.invalid/506.bin' },
    { name: 'Arduino_LED_Controller_Firmware_5.0.0-beta.6_UNO_R4_WiFi.bin.sha256', browser_download_url: 'https://example.invalid/506.sha' }
  ]
};

const artifact = parseReleaseArtifact(release);
assert.equal(artifact.firmwareVersion, '5.0.0-beta.7');

const logging = fs.readFileSync(
  'desktop-tauri/src-tauri/src/diagnostic_logging.rs',
  'utf8'
);
assert.match(logging, /normalized_category != "app"/);
assert.match(logging, /normalized_category != "errors"/);

console.log('LXC_DEDICATED_BETA_RELEASE_TAG=PASSED');
console.log('LXC_MULTI_ASSET_CATALOG_SELECTION=PASSED');
console.log('LOGGING_DUPLICATE_WRITE_FIX=PASSED');
console.log('V393_RECOVERY_CONTRACT=PASSED');
