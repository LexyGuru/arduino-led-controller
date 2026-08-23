#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const css=fs.readFileSync('desktop-tauri/src/core-ui-v3.css','utf8');
const page=fs.readFileSync('desktop-tauri/src/pages/LedsPage.tsx','utf8');
const rust=fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
const api=fs.readFileSync('desktop-tauri/src/services/tauriApi.ts','utf8');

assert.match(page,/className="visual31-led-preview__readout"/);
assert.match(page,/<strong>\{brightnessPercent\}%<\/strong>/);

const owned=css.slice(css.indexOf('/* V765 - Mobile LED readout visibility */'));
assert.ok(owned.length>0);
assert.match(owned,/min-height: 48px;/);
assert.match(owned,/padding: 8px 10px;/);
assert.match(owned,/visibility: visible;/);
assert.match(owned,/visual31-led-preview\.is-off \.visual31-led-preview__readout/);

assert.match(api,/invoke\('firmware_releases',\{channel\}\)/);
assert.match(rust,/async fn github_release_by_tag\(tag: &str\)/);
assert.match(rust,/releases\/tags\/\{\}/);
assert.match(rust,/github_release_by_tag\(FIRMWARE_BETA_RELEASE_TAG\)\.await/);
assert.match(rust,/async fn firmware_releases\([\s\S]*firmware_releases_for_channel\(normalized_channel\)\.await\?/);
assert.match(rust,/async fn latest_firmware\([\s\S]*firmware_releases_for_channel\(normalized_channel\)/);

console.log('V765_MOBILE_LED_READOUT_VISIBLE=PASSED');
console.log('V765_MOBILE_LED_OFF_STATE_READOUT_VISIBLE=PASSED');
console.log('V765_NATIVE_BETA_RELEASE_DIRECT_LOOKUP=PASSED');
console.log('V765_NATIVE_BETA_CATALOG_CHANNEL_CHAIN=PASSED');
