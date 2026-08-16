#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read=(p)=>fs.readFileSync(p,'utf8');
const sidebar=read('desktop-tauri/src/components/Sidebar.tsx');
const topbar=read('desktop-tauri/src/components/Topbar.tsx');
const dashboard=read('desktop-tauri/src/pages/DashboardPage.tsx');
const main=read('desktop-tauri/src/main.tsx');
const css=read('desktop-tauri/src/v551-beta4-shell-dashboard-redesign.css');
const pkg=JSON.parse(read('package.json'));

assert.match(sidebar,/core-version-pill">UI 2\.0</);
assert.match(sidebar,/beta4-version-pill">Beta 4</);
assert.match(topbar,/core-topbar-version">Core UI 2\.0</);
assert.match(topbar,/beta4-topbar-version">Beta 4 UI</);
assert.match(dashboard,/className="page v55-dashboard beta4-dashboard-redesign"/);
assert.match(main,/import '\.\/v551-beta4-shell-dashboard-redesign\.css';/);

for(const marker of [
  '.beta4-ui-baseline .core-sidebar',
  'position: fixed',
  '.beta4-ui-baseline .core-topbar',
  '.beta4-dashboard-redesign .v55-dashboard-hero',
  '.beta4-dashboard-redesign .v55-primary-card',
  '.beta4-dashboard-redesign .v55-orbit-core',
  '@media (prefers-reduced-motion: reduce)',
  '@keyframes beta4-orbit'
]){
  assert.ok(css.includes(marker),`missing redesign CSS contract: ${marker}`);
}

for(const token of [
  '--beta4-glass-bg',
  '--beta4-glass-border',
  '--beta4-glow',
  '--beta4-shadow',
  '--beta4-highlight'
]){
  assert.ok(css.includes(token),`missing modern token: ${token}`);
}

assert.ok(!css.includes('#00ffff'));
assert.ok(!css.includes('#8b5cf6'));
assert.ok(css.includes('var(--ds-accent)'));
assert.ok(css.includes('var(--ds-background)'));
assert.ok(css.includes('var(--ds-surface-raised)'));

assert.equal(
  pkg.scripts['test:beta4-shell-dashboard-redesign'],
  'node scripts/test-beta4-shell-dashboard-redesign.mjs'
);

console.log('BETA4_CORE_UI_2_0_CURRENT_IDENTITY=PASSED');
console.log('BETA4_MODERN_GLASS_SIDEBAR=PASSED');
console.log('BETA4_MODERN_GLASS_TOPBAR=PASSED');
console.log('BETA4_DASHBOARD_AURORA_HERO=PASSED');
console.log('BETA4_DASHBOARD_GLASS_KPI=PASSED');
console.log('BETA4_DASHBOARD_ORBIT_VISUAL=PASSED');
console.log('BETA4_THEME_SAFE_DESIGN_TOKENS=PASSED');
console.log('BETA4_REDUCED_MOTION=PASSED');
console.log('BETA4_SHELL_DASHBOARD_REDESIGN=PASSED');
