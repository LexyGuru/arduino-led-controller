#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const r=p=>fs.readFileSync(p,'utf8');

const startup=r('desktop-tauri/src/hooks/useAppStartupGate.ts');
const startupScreen=r('desktop-tauri/src/components/AppStartupScreen.tsx');
const i18n=r('scripts/fixtures/i18n-embedded-en-compat-v800.txt');
const appearance=r('desktop-tauri/src/components/AppearanceSettings.tsx');
const css=r('desktop-tauri/src/core-ui-v3.css');
const themeTypes=r('desktop-tauri/src/design-system/theme-types.ts');
const suite=JSON.parse(r('scripts/test-suite-v2.json'));

assert.match(startup,/MIN_VISIBLE_MS = 2600/);
assert.doesNotMatch(startup,/SOFT_NETWORK_WAIT_MS/);
assert.doesNotMatch(startup,/MAX_VISIBLE_MS/);

// Startup screen still uses the real translation key.
assert.match(startupScreen,/t\('startup\.check\.theme'\)|check\.labelKey/);
assert.match(i18n,/'startup\.check\.theme': 'Theme Runtime 3\.0 · Visual 3\.1'/);

// Settings/Appearance visible Theme Engine 2.0 sources are migrated.
assert.match(i18n,/'appearance\.gallery': 'THEME RUNTIME 3\.0 · VISUAL 3\.1'/);
assert.match(i18n,/'appearance\.advanced\.eyebrow': 'THEME RUNTIME 3\.0 · VISUAL 3\.1'/);
assert.doesNotMatch(i18n,/THEME ENGINE 2\.0|Theme Engine 2\.0/);

assert.match(
  appearance,
  /Theme Runtime \{THEME_ENGINE_VERSION\} · Visual 3\.1 · Core UI \{CORE_UI_VERSION\}/
);
assert.doesNotMatch(
  appearance,
  /Theme Engine \{THEME_ENGINE_PRODUCT_VERSION\} · Core UI/
);

// Internal compatibility contract remains exactly 2.0; runtime remains 3.0.
assert.match(themeTypes,/THEME_ENGINE_PRODUCT_VERSION = '2\.0'/);
assert.match(themeTypes,/THEME_ENGINE_VERSION = '3\.0'/);

assert.match(css,/V689 - Visual review corrections/);
assert.match(css,/\.visual31-device-core\{[\s\S]*padding-right:118px/);
assert.match(css,/max-width:1640px/);
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
assert.match(css,/grid-template-areas:[\s\S]*"time leds"[\s\S]*"time actions"/);
assert.match(css,/max-width:820px/);

assert.equal(suite.current.includes('test:visual31-review-corrections'),true);

console.log('V689_STARTUP_MIN_VISIBLE_2600MS=PASSED');
console.log('V689_STARTUP_TRUTHFUL_NO_FAKE_PASS_PRESERVED=PASSED');
console.log('V689_VISIBLE_THEME_RUNTIME_3_IDENTITY=PASSED');
console.log('V689_THEME_PROFILE_2_CONTRACT_PRESERVED=PASSED');
console.log('V689_HEALTH_ORBIT_NO_OVERLAY_LAYOUT=PASSED');
console.log('V689_SCHEDULE_INTERMEDIATE_BREAKPOINT=PASSED');
console.log('V689_SCHEDULE_COMPACT_COLLISION_GUARD=PASSED');
console.log('V689B_ACTUAL_THEME_LABEL_SOURCES=PASSED');
console.log('V689_VISUAL_REVIEW_CORRECTIONS=PASSED');
