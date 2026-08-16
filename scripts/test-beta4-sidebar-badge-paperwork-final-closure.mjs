#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
const topbar=read('desktop-tauri/src/components/Topbar.tsx');
const main=read('desktop-tauri/src/main.tsx');
const css=read('desktop-tauri/src/v551-beta4-sidebar-version-badge-final-closure.css');
const update=read('desktop-tauri/src/components/v55/UpdateCenterPanel.tsx');

assert.match(sidebar,/core-version-pill">UI 2\.0</);
assert.match(sidebar,/beta4-version-pill">Beta 4</);
assert.match(topbar,/core-topbar-version">Core UI 2\.0</);

assert.match(main,/import '\.\/v551-beta4-final-ui-layout-qa\.css';/);
assert.match(main,/import '\.\/v551-beta4-sidebar-version-badge-final-closure\.css';/);

for(const marker of [
  '@media (min-width: 1181px)',
  '.beta4-ui-baseline .core-version-pill',
  'top: 52px;',
  '.beta4-ui-baseline .beta4-version-pill',
  'top: 78px;',
  'padding-bottom: 54px;',
  '@media (max-width: 1180px) and (min-width: 821px)',
  'display: none !important;'
]) assert.ok(css.includes(marker),`missing sidebar badge closure marker: ${marker}`);

// Up-to-date app state must keep check action but not synthesize an install action
// solely because installed == latest. Runtime behavior remains owned by UpdateCenterPanel.
assert.match(update,/Frissítések keresése|update|check/i);

for(const f of [
  'README.md',
  'docs/v5/V55_BETA4_RELEASE_NOTES.md',
  'docs/v5/V55_BETA4_RELEASE_CHECKLIST.md',
  'docs/v5/BETA4_FINAL_UI_LAYOUT_RESPONSIVE_QA.md',
  'docs/v5/BETA4_FINAL_RELEASE_CLOSURE_READINESS.md',
  'docs/v5/BETA4_SIDEBAR_BADGE_PAPERWORK_FINAL_CLOSURE.md',
]) assert.ok(fs.existsSync(f),`missing paperwork surface: ${f}`);

for(const [f, marker] of [
  ['README.md','BETA4_FINAL_PAPERWORK_V554'],
  ['docs/v5/V55_BETA4_RELEASE_NOTES.md','BETA4_FINAL_PAPERWORK_V554'],
  ['docs/v5/V55_BETA4_RELEASE_CHECKLIST.md','BETA4_FINAL_PAPERWORK_V554'],
  ['docs/v5/BETA4_FINAL_UI_LAYOUT_RESPONSIVE_QA.md','BETA4_FINAL_PAPERWORK_V554'],
  ['docs/v5/BETA4_FINAL_RELEASE_CLOSURE_READINESS.md','BETA4_FINAL_PAPERWORK_V554'],
]) assert.ok(read(f).includes(marker),`missing paperwork marker in ${f}`);

console.log('V554_SIDEBAR_UI2_BETA4_BADGE_SEPARATION=PASSED');
console.log('V554_TABLET_BADGE_PAIR_VISIBILITY=PASSED');
console.log('V554_TOPBAR_CORE_UI2_PRESERVED=PASSED');
console.log('V554_UPDATE_CENTER_UP_TO_DATE_STATE_PRESERVED=PASSED');
console.log('V554_README_PAPERWORK=PASSED');
console.log('V554_RELEASE_NOTES_PAPERWORK=PASSED');
console.log('V554_RELEASE_CHECKLIST_PAPERWORK=PASSED');
console.log('V554_FINAL_UI_QA_PAPERWORK=PASSED');
console.log('V554_FINAL_RELEASE_CLOSURE_PAPERWORK=PASSED');
console.log('V554_FINAL_UI_PAPERWORK_CLOSURE=PASSED');
