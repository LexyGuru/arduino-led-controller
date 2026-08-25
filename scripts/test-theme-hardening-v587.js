#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (p) => fs.readFileSync(p, 'utf8');

const types = read('desktop-tauri/src/design-system/theme-types.ts');
const storage = read('desktop-tauri/src/design-system/theme-storage.ts');
const provider = read('desktop-tauri/src/design-system/ThemeProvider.tsx');
const appearance = read('desktop-tauri/src/components/AppearanceSettings.tsx');
const advanced = read('desktop-tauri/src/design-system/theme-advanced.ts');
const advancedEditor = read('desktop-tauri/src/components/ThemeAdvancedEditor.tsx');
const startup = read('desktop-tauri/src/hooks/useAppStartupGate.ts');
const startupCss = read('desktop-tauri/src/app-startup-motion.css');
const css = read('desktop-tauri/src/theme-engine-v3.css');
const i18n = read('scripts/fixtures/i18n-embedded-en-compat-v800.txt');
assert.match(types, /THEME_ENGINE_PRODUCT_VERSION = '2\.0'/);
assert.match(types, /THEME_SCHEMA_VERSION = 2/);
assert.match(types, /THEME_ENGINE_VERSION = '3\.0'/); // internal compatibility selector only
assert.match(types, /schemaVersion: 2/);
assert.match(types, /themeEngine: '2\.0'/);

assert.match(storage, /legacyThemeEngine3/);
assert.match(storage, /sourceRecord\s*=\s*source as unknown as Record<string, unknown>/);
assert.match(storage, /rawRecord\s*=\s*raw as unknown as Record<string, unknown>/);
assert.match(storage, /schemaVersion: 2/);
assert.match(storage, /themeEngine: '2\.0'/);
assert.match(storage, /rawRecord\.schemaVersion === 1/);
assert.match(storage, /rawRecord\.themeEngine === '3\.0'/);

assert.match(provider, /dataset\.themeProduct/);
assert.match(provider, /dataset\.themeSchema/);

assert.match(appearance, /THEME_ENGINE_VERSION/);
assert.doesNotMatch(appearance, /THEME_ENGINE_PRODUCT_VERSION/);
assert.match(
  appearance,
  /Theme Runtime \{THEME_ENGINE_VERSION\} · Visual 3\.1 · Core UI \{CORE_UI_VERSION\}/
);
assert.match(appearance, /theme-engine-2-profile\.json/);

for (const visible of [
  "appearance.gallery': 'THEME RUNTIME 3.0 · VISUAL 3.1",
  "startup.check.theme': 'Theme Runtime 3.0 · Visual 3.1",
  "appearance.advanced.eyebrow': 'THEME RUNTIME 3.0 · VISUAL 3.1"
]) {
  assert.match(i18n, new RegExp(visible.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
}
assert.doesNotMatch(i18n, /THEME ENGINE 2\.0|Theme Engine 2\.0/);

for (const semantic of ['--ds-success','--ds-info','--ds-warning','--ds-error']) {
  assert.match(css + read('desktop-tauri/src/beta7-theme.css'), new RegExp(semantic));
}
assert.match(advanced, /success:'#34d399'/);
assert.match(advanced, /warning:'#fbbf24'/);
assert.match(advanced, /error:'#fb7185'/);

for (let i = 1; i <= 6; i++) {
  assert.match(css, new RegExp(`--ds-chart-${i}`));
}
assert.match(css, /data-chart-accessibility='deuteranopia'/);
assert.match(css, /data-chart-accessibility='protanopia'/);
assert.match(css, /data-chart-accessibility='tritanopia'/);
assert.match(css, /data-chart-accessibility='monochrome'/);

assert.match(startupCss, /prefers-reduced-motion\s*:\s*reduce/);
assert.match(css, /prefers-reduced-motion\s*:\s*reduce/);
assert.match(startupCss, /page-transition-stage/);
assert.match(startupCss, /app-startup-screen/);
assert.match(css, /data-visual-fx='aurora-flow'/);
assert.match(css, /data-visual-fx='soft-pulse'/);

assert.doesNotMatch(startup, /MAX_VISIBLE_MS/);
assert.doesNotMatch(startup, /SOFT_NETWORK_WAIT_MS/);
assert.match(startup, /MIN_VISIBLE_MS = 2600/);
assert.match(startup, /connectionHealth\.state === 'healthy'/);
assert.match(startup, /update\('arduino', 'pending', 'startup\.detail\.arduinoBackground'\)/);
assert.doesNotMatch(startup, /state: 'pass', detailKey: 'startup\.detail\.backgroundContinue'/);

assert.match(advancedEditor, /theme-advanced-grid/);
assert.match(appearance, /custom-theme-editor/);
assert.match(startupCss, /@media\s*\(\s*max-width\s*:\s*720px\s*\)/);
assert.match(css, /@media\s*\(\s*max-width\s*:\s*820px\s*\)/);

console.log('V587_PRODUCT_IDENTITY_THEME_ENGINE_2_0=PASSED');
console.log('V587_PRODUCT_PROFILE_2_RUNTIME_3_VISUAL31_IDENTITY=PASSED');
console.log('V587_PROFILE_SCHEMA_V2_MIGRATION=PASSED');
console.log('V587_SEMANTIC_COLOR_LOCK=PASSED');
console.log('V587_CHART_TOKEN_CONTRACT=PASSED');
console.log('V587_REDUCED_MOTION_CONTRACT=PASSED');
console.log('V587_STARTUP_PAGE_MOTION_REGRESSION=PASSED');
console.log('V587_TRUTHFUL_STARTUP_TIMEOUT_HARDENING=PASSED');
console.log('V587_RESPONSIVE_THEME_CONTRACT=PASSED');
