#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const main = read('desktop-tauri/src/main.tsx');
const types = read('desktop-tauri/src/design-system/theme-types.ts');
const storage = read('desktop-tauri/src/design-system/theme-storage.ts');
const provider = read('desktop-tauri/src/design-system/ThemeProvider.tsx');
const catalog = read('desktop-tauri/src/design-system/theme-catalog.ts');
const appearance = read('desktop-tauri/src/components/AppearanceSettings.tsx');
const css = read('desktop-tauri/src/theme-engine-v2.css');
const i18n = read('desktop-tauri/src/i18n/runtime.ts');

assert.match(main, /theme-engine-v2\.css/);
assert.match(types, /THEME_ENGINE_VERSION = '2\.0'/);
assert.match(types, /CORE_UI_VERSION = '1\.5'/);
assert.match(storage, /appearance\.v2/);
assert.match(storage, /appearance\.v1/);
assert.match(storage, /migrated/);
assert.match(provider, /dataset\.themeEngine/);
for (const attr of ['glassStrength','motion','glow','backgroundArt']) {
  assert.match(provider, new RegExp(`dataset\\.${attr}`));
}
for (const theme of ['sunset-glass','midnight-neon','arctic-frost','oled-black','amber-control']) {
  assert.match(types, new RegExp(`'${theme}'`));
  assert.match(catalog, new RegExp(`id: '${theme}'`));
  assert.match(css, new RegExp(`data-theme='${theme}'`));
  assert.match(appearance, new RegExp('THEME_CATALOG'));
  const escaped = `appearance.theme.${theme}`.replaceAll('.', '\\.');
  const count = (i18n.match(new RegExp(`['\"]${escaped}['\"]`, 'g')) || []).length;
  assert.equal(count, 3, `${theme}: HU/EN/DE parity`);
}
for (const key of [
  'appearance.gallery','appearance.galleryTitle','appearance.reset',
  'appearance.motion','appearance.glassStrength','appearance.glow',
  'appearance.backgroundArt','appearance.helpV2'
]) {
  const escaped = key.replaceAll('.', '\\.');
  const count = (i18n.match(new RegExp(`['\"]${escaped}['\"]`, 'g')) || []).length;
  assert.equal(count, 3, `${key}: HU/EN/DE parity`);
}
assert.match(css, /@media\(max-width:720px\)/);
assert.match(appearance, /aria-pressed/);
assert.match(appearance, /data-mobile-theme-parity="full"/);
console.log('OK: Theme Engine 2.0 full preset gallery, v1→v2 migration, cross-platform responsive contract');
