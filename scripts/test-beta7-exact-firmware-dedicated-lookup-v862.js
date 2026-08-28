#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const rust = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');

const startMarker = "let artifact = if let Some(version) = requested_tag {";
const endMarker = "let available = artifact";

const start = rust.indexOf(startMarker);
assert.ok(start >= 0, 'Exact requested_tag firmware lookup blokk hiányzik');

const end = rust.indexOf(endMarker, start);
assert.ok(end > start, 'Exact requested_tag firmware lookup blokk vége hiányzik');

const block = rust.slice(start, end);

assert.ok(
  block.includes('firmware_releases_for_channel(normalized_channel)'),
  'Exact firmware install nem a dedicated channel-aware release lookupot használja.'
);

assert.ok(
  !block.includes('github_releases()'),
  'Exact firmware install még mindig a generikus GitHub top-30 release-listát használja.'
);

assert.ok(
  block.includes('firmware_artifacts_from_release_channel(release, normalized_channel)'),
  'Exact firmware install nem a channel-aware firmware artifact parseren megy át.'
);

assert.ok(
  block.includes('normalize_version('),
  'Exact firmware version comparison normalization hiányzik.'
);

assert.ok(
  rust.includes('async fn firmware_releases_for_channel(channel: &str)'),
  'Dedicated firmware channel lookup hiányzik.'
);

assert.ok(
  rust.includes('github_release_by_tag(FIRMWARE_BETA_RELEASE_TAG).await'),
  'Beta dedicated release tag lookup hiányzik.'
);

assert.ok(
  rust.includes('const FIRMWARE_BETA_RELEASE_TAG: &str = "Arduino_LED_Controller_Firmware_BETA"'),
  'Canonical Beta firmware release tag hiányzik.'
);

console.log('EXACT_REQUESTED_TAG_BLOCK_FOUND=PASSED');
console.log('EXACT_FIRMWARE_INSTALL_DEDICATED_LOOKUP=PASSED');
console.log('GENERIC_TOP30_RELEASE_LOOKUP_REMOVED_FROM_EXACT_INSTALL=PASSED');
console.log('V862B_BETA7_EXACT_FIRMWARE_LOOKUP_REGRESSION=PASSED');
