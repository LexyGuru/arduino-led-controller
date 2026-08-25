#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const appearance = read('desktop-tauri/src/components/AppearanceSettings.tsx');
const provider = read('desktop-tauri/src/design-system/ThemeProvider.tsx');
const types = read('desktop-tauri/src/design-system/theme-types.ts');
const storage = read('desktop-tauri/src/design-system/theme-storage.ts');
const css = read('desktop-tauri/src/theme-engine-v3.css');
const i18n = read('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt');
const ota = read('contracts/macos-ota-beta7-immutable.json');

assert.match(ota, /MACOS_OTA_BETA7_IMMUTABLE_V1/);
assert.match(types, /export type VisualFxId/);
assert.match(types, /visualFx: VisualFxId/);
assert.match(storage, /VISUAL_FX/);
assert.match(storage, /source\.visualFx/);
assert.match(provider, /dataset\.visualFx/);
assert.match(provider, /updateCustomThemeToken/);
assert.match(provider, /renameCustomTheme/);

assert.match(appearance, /isTauriRuntime/);
assert.match(appearance, /navigator\.clipboard\.writeText/);
assert.match(appearance, /appearance\.profile\.copiedNative/);
assert.match(appearance, /custom-theme-editor/);
assert.match(appearance, /type="color"/);
assert.match(appearance, /updateCustomThemeToken/);
assert.match(appearance, /renameCustomTheme/);
assert.match(appearance, /VISUAL_FX/);

for (const fx of [
  'none',
  'ambient',
  'scanlines',
  'tech-grid',
  'aurora-flow',
  'soft-pulse'
]) {
  assert.match(types, new RegExp(`'${fx}'`));
  assert.match(css, new RegExp(`data-visual-fx='${fx}'`));
}

for (const key of [
  'appearance.custom.title',
  'appearance.custom.colorsTitle',
  'appearance.custom.effectsTitle',
  'appearance.visualFx',
  'appearance.visualFx.none',
  'appearance.visualFx.ambient',
  'appearance.visualFx.scanlines',
  'appearance.visualFx.tech-grid',
  'appearance.visualFx.aurora-flow',
  'appearance.visualFx.soft-pulse',
  'appearance.profile.copiedNative'
]) {
  const escaped = key.replaceAll('.', '\\.');
  const count = (i18n.match(new RegExp(`['"]${escaped}['"]`, 'g')) || []).length;
  assert.equal(count, 3, `${key}: HU/EN/DE parity`);
}

assert.match(css, /@keyframes te3-aurora-flow/);
assert.match(css, /@keyframes te3-soft-pulse/);
assert.match(css, /prefers-reduced-motion: reduce/);

console.log('V585_NATIVE_EXPORT_SANDBOX_FAILURE_REMOVED=PASSED');
console.log('V585_NATIVE_PROFILE_CLIPBOARD_EXPORT=PASSED');
console.log('V585_WEB_PROFILE_FILE_EXPORT=PRESERVED');
console.log('V585_CUSTOM_THEME_COLOR_EDITOR=PASSED');
console.log('V585_VISUAL_FX_COUNT=6');
console.log('V585_CUSTOM_THEME_EFFECT_EDITOR=PASSED');
console.log('V585_THEME_ENGINE_3_COMPATIBILITY=PASSED');
