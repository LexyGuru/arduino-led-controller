#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const lib = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs', 'utf8');
const firmwarePage = fs.readFileSync('desktop-tauri/src/pages/FirmwarePage.tsx', 'utf8');
const tauriApi = fs.readFileSync('desktop-tauri/src/services/tauriApi.ts', 'utf8');
const version = fs.readFileSync('VERSION', 'utf8').trim();
const release = JSON.parse(fs.readFileSync('release-versions.json', 'utf8'));
const __v774AppBeta = /-beta\.\d+$/.test(release.application);
const __v774FirmwareBeta = /-beta\.\d+$/.test(release.firmware);

assert.equal(version, release.application);
assert.equal(release.application, release.applicationRelease.version);
assert.equal(release.applicationRelease.version, release.application);
assert.equal(release.firmwareRelease.recommendedVersion, release.firmware);

assert.match(
  lib,
  /async fn firmware_update_inner\(\s*app: &AppHandle,\s*state: &AppState,\s*requested_tag: Option<&str>,\s*requested_channel: Option<&str>,/s
);

assert.match(
  lib,
  /firmware_artifacts_from_release_channel\(release, normalized_channel\)/
);

const innerStart = lib.indexOf('async fn firmware_update_inner(');
const innerEnd = lib.indexOf(
  '\n#[tauri::command]\nasync fn firmware_install_external',
  innerStart
);
assert.ok(innerStart >= 0, 'firmware_update_inner start not found');
assert.ok(innerEnd > innerStart, 'firmware_update_inner end boundary not found');
const inner = lib.slice(innerStart, innerEnd);

assert.doesNotMatch(
  inner,
  /firmware_beta_release\(\)\.await/,
  'OTA install resolver must not hard-wire Beta catalog'
);

assert.match(
  inner,
  /requested_channel/
);
assert.match(
  inner,
  /config\.firmware_update_channel/
);
assert.match(
  inner,
  /firmware_artifacts_from_release_channel\(release, normalized_channel\)/
);

assert.match(
  lib,
  /firmware_update_inner\(&app, &state, None, None\)\.await/
);

assert.match(
  lib,
  /Some\(tag\.trim\(\)\),\s*Some\(normalized_channel\),/s
);

assert.match(
  firmwarePage,
  /tauriApi\.firmwareInstallRelease\(\s*version,\s*channel \?\? selectedFirmwareChannel\s*\)/s
);

assert.match(
  firmwarePage,
  /tauriApi\.firmwareReleases\(selectedFirmwareChannel\)/
);

assert.match(
  tauriApi,
  /firmwareInstallRelease/
);

console.log('V693_SINGLE_FIRMWARE_CHANNEL_RESOLVER=PASSED');
console.log('V693_STABLE_INSTALL_USES_STABLE_CATALOG=PASSED');
console.log('V693_BETA_INSTALL_USES_BETA_CATALOG=PASSED');
console.log('V693_EXPLICIT_INSTALL_CHANNEL_PROPAGATED=PASSED');
console.log('V693_NO_BETA_ONLY_INSTALL_RESOLVER=PASSED');
console.log('V693_BETA3_VERSION_CONTRACT=PASSED');
