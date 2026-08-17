#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=(p)=>fs.readFileSync(p,'utf8');

const app=read('desktop-tauri/src/App.tsx');
const controller=read('desktop-tauri/src/hooks/useController.ts');
const startup=read('desktop-tauri/src/hooks/useAppStartupGate.ts');
const screen=read('desktop-tauri/src/components/AppStartupScreen.tsx');
const main=read('desktop-tauri/src/main.tsx');
const css=read('desktop-tauri/src/app-startup-motion.css');
const i18n=read('desktop-tauri/src/i18n/runtime.ts');
const theme=read('desktop-tauri/src/design-system/theme-types.ts');

assert.match(theme,/THEME_ENGINE_VERSION = '3\.0'/);
assert.match(app,/useAppStartupGate/);
assert.match(app,/AppStartupScreen/);
assert.match(app,/key=\{page\}/);
assert.match(app,/page-transition-stage/);
assert.match(app,/app-shell--booting/);
assert.match(controller,/busy,\s*\n\s*initialized,\s*\n\s*message,/);
assert.match(startup,/MIN_VISIBLE_MS = 1200/);
assert.match(startup,/SOFT_NETWORK_WAIT_MS = 3200/);
assert.match(startup,/MAX_VISIBLE_MS = 4800/);
assert.match(startup,/connectionHealth\.state === 'healthy'/);
assert.match(startup,/startup\.detail\.arduinoBackground/);
assert.match(startup,/localStorage/);
assert.match(startup,/dataset\.themeEngine === '3\.0'/);

for(const id of ['shell','theme','version','runtime','config','schedules','storage','arduino']){
  assert.match(startup,new RegExp(`id: '${id}'`));
}

assert.match(screen,/data-startup-check/);
assert.match(screen,/app-startup-progress/);
assert.match(screen,/v5-icon\.png/);
assert.match(main,/app-startup-motion\.css/);
assert.match(css,/@keyframes v584-page-enter/);
assert.match(css,/@media \(prefers-reduced-motion: reduce\)/);
assert.match(css,/data-motion='expressive'/);
assert.match(css,/data-motion='reduced'/);

for(const key of [
  'startup.eyebrow','startup.title','startup.subtitle','startup.progress',
  'startup.ready','startup.check.shell','startup.check.theme',
  'startup.check.version','startup.check.runtime','startup.check.config',
  'startup.check.schedules','startup.check.storage','startup.check.arduino'
]){
  const escaped=key.replaceAll('.','\\.');
  const count=(i18n.match(new RegExp(`['"]${escaped}['"]`,'g'))||[]).length;
  assert.equal(count,3,`${key}: HU/EN/DE parity`);
}

console.log('V584_STARTUP_GATE_8_CHECKS=PASSED');
console.log('V584_STARTUP_NON_BLOCKING_NETWORK_WARNING=PASSED');
console.log('V584_PAGE_TRANSITION_MOTION=PASSED');
console.log('V584_REDUCED_MOTION_ACCESSIBILITY=PASSED');
console.log('V584_THEME_ENGINE_3_INTEGRATION=PASSED');
console.log('V584_HU_EN_DE_STARTUP_I18N=PASSED');
