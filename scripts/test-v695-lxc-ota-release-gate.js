#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const api = fs.readFileSync('desktop-tauri/src/services/tauriApi.ts','utf8');
const env = fs.readFileSync('deploy/staging.env.example','utf8');
const rust = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
const v615 = fs.readFileSync('scripts/test-v615-firmware-channel-startup-contract.js','utf8');
const release = JSON.parse(fs.readFileSync('release-versions.json','utf8'));

assert.equal(release.application,'5.7.0-beta.3');
assert.equal(release.applicationRelease.channel,'beta');
assert.equal(release.firmware,'5.0.0');

assert.ok(env.includes('RELEASE_CANDIDATE=beta.3-gate'));
assert.ok(env.includes('RELEASE_TARGET_VERSION=5.7.0-beta.3'));
assert.ok(!env.includes('RELEASE_CANDIDATE=beta.1-gate'));

assert.doesNotMatch(api,/function controlToken\(/);
assert.doesNotMatch(api,/alc\.shared\.lxc\.ota-control-token/);
assert.doesNotMatch(api,/Add meg az LXC OTA control tokent/);
assert.match(api,/async function install\(version:string,channel\?:'stable'\|'beta'\)/);
assert.match(api,/const selected=channel\?\?config\(\)\.firmwareUpdateChannel/);
assert.match(api,/const catalog=await releases\(selected\)/);
assert.match(api,/const canonicalVersion=wanted\.firmwareVersion\?\?wanted\.tag/);
assert.match(api,/credentials:'same-origin'/);
assert.match(api,/body:JSON\.stringify\(\{version:canonicalVersion,channel:selected\}\)/);
assert.doesNotMatch(api,/X-LXC-OTA-Token/);
assert.match(api,/firmwareInstallRelease:\(tag:string,channel\?:'stable'\|'beta'\).*:install\(tag,channel\)/);
assert.match(api,/const channel=config\(\)\.firmwareUpdateChannel;const list=await releases\(channel\)/);
assert.match(api,/return install\(list\[0\]\.firmwareVersion\?\?list\[0\]\.tag,channel\)/);
assert.match(api,/saveOtaPassword:.*LXC-ben az OTA-jelszó szerveroldali titok/);

assert.match(rust,/let artifact = if let Some\(version\) = requested_tag[\s\S]*github_releases\(\)[\s\S]*firmware_artifacts_from_release_channel\(release, normalized_channel\)/);
assert.match(v615,/github_releases\\\(\\\)/);
assert.match(v615,/firmware_artifacts_from_release_channel/);
assert.doesNotMatch(v615,/requested_tag\[\\s\\S\]\*firmware_beta_release/);

console.log('V695B_RELEASE_CANDIDATE_BETA3_GATE=PASSED');
console.log('V695B_LXC_SELECTED_FIRMWARE_CHANNEL_PROPAGATED=PASSED');
console.log('V695B_LXC_BROWSER_AUTH_AUTOMATIC=PASSED');
console.log('V695B_LXC_HEADLESS_TOKEN_NOT_EXPOSED_TO_BROWSER=PASSED');
console.log('V695B_LXC_OTA_PASSWORD_SERVER_SIDE_ONLY=PASSED');
console.log('V695B_V615_STALE_REGRESSION_CONTRACT_RECOVERED=PASSED');
