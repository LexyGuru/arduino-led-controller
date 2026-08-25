#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const main=read('desktop-tauri/src/main.tsx');
const types=read('desktop-tauri/src/design-system/theme-types.ts');
const storage=read('desktop-tauri/src/design-system/theme-storage.ts');
const provider=read('desktop-tauri/src/design-system/ThemeProvider.tsx');
const catalog=read('desktop-tauri/src/design-system/theme-catalog.ts');
const contrast=read('desktop-tauri/src/design-system/theme-contrast.ts');
const appearance=read('desktop-tauri/src/components/AppearanceSettings.tsx');
const css=read('desktop-tauri/src/theme-engine-v3.css');
const i18n=read('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt');

assert.match(main,/theme-engine-v3\.css/);
assert.match(types,/THEME_ENGINE_VERSION = '3\.0'/);
assert.match(types,/ThemeProfileDocument/);
assert.match(types,/CustomThemeDocument/);
assert.match(storage,/appearance\.v3/);
assert.match(storage,/appearance\.v2/);
assert.match(storage,/appearance\.v1/);
assert.match(storage,/CUSTOM_THEME_TOKEN_MAP/);
assert.match(provider,/dataset\.themeEngine/);
assert.match(provider,/dataset\.material/);
assert.match(provider,/dataset\.gradient/);
assert.match(provider,/dataset\.contrast/);
assert.match(provider,/cloneCurrentTheme/);
assert.match(provider,/importThemeProfile/);
assert.match(provider,/exportThemeProfile/);
assert.match(provider,/macos_sync_app_icon/);
assert.match(contrast,/4\.5/);
assert.match(appearance,/application\/json/);
assert.match(appearance,/data-mobile-theme-parity="full"/);

for(const theme of ['graphite-pro','aurora-drive','cyber-violet','crimson-noir','mint-lab','custom']){
  assert.match(types,new RegExp(`'${theme}'`));
  assert.match(catalog,new RegExp(`id: '${theme}'`));
  if(theme!=='custom') assert.match(css,new RegExp(`data-theme='${theme}'`));
}
for(const accent of ['teal','amber','lime','indigo']){
  assert.match(types,new RegExp(`'${accent}'`));
  assert.match(css,new RegExp(`data-accent='${accent}'`));
}
for(const key of ['appearance.gallery','appearance.material','appearance.gradient','appearance.contrast','appearance.profile.clone','appearance.profile.export','appearance.profile.import']){
  const escaped=key.replaceAll('.','\\.');
  const count=(i18n.match(new RegExp(`['"]${escaped}['"]`,'g'))||[]).length;
  assert.equal(count,3,`${key}: HU/EN/DE parity`);
}
assert.match(css,/--ds-chart-1/);
assert.match(css,/@media\(max-width:720px\)/);
console.log('THEME_ENGINE_3_SCHEMA=PASSED');
console.log('THEME_ENGINE_3_FACTORY_THEMES=PASSED');
console.log('THEME_ENGINE_3_CUSTOM_IMPORT_EXPORT=PASSED');
console.log('THEME_ENGINE_3_CONTRAST_VALIDATOR=PASSED');
console.log('THEME_ENGINE_3_CROSS_PLATFORM_SHARED_FRONTEND=PASSED');
