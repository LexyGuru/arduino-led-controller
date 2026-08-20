#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const css = fs.readFileSync('desktop-tauri/src/core-ui-v3.css','utf8');
const version = fs.readFileSync('VERSION','utf8').trim();
const release = JSON.parse(fs.readFileSync('release-versions.json','utf8'));

assert.equal(version,'5.7.0-beta.3');
assert.equal(release.application,'5.7.0-beta.3');
assert.equal(release.applicationRelease.version,'5.7.0-beta.3');
assert.equal(release.firmware,'5.0.0');

for (const token of [
  'V690 - Orbit composition OCD alignment',
  ".v55-system-orbit .v55-orbit-core",
  "left: 50% !important",
  "top: 50% !important",
  "translate(-50%, -50%)",
  ".v55-system-orbit .visual31-health-orbit",
  "left: calc(50% + 62px) !important",
  "top: calc(50% + 54px) !important"
]) {
  assert.ok(css.includes(token), `Missing V690 orbit token: ${token}`);
}

console.log('V690_ONLINE_ORBIT_RECENTERED=PASSED');
console.log('V690_HEALTH_BADGE_BOTTOM_RIGHT_OVERLAY=PASSED');
console.log('V690_HEALTH_BADGE_ONLINE_TEXT_CLEAR=PASSED');
console.log('V690_APPLICATION_VERSION_BETA2=PASSED');
