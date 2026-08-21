#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const r=p=>fs.readFileSync(p,'utf8');
const h=r('desktop-tauri/src/hooks/useAppStartupGate.ts'),s=r('desktop-tauri/src/components/AppStartupScreen.tsx'),a=r('desktop-tauri/src/App.tsx'),t=r('desktop-tauri/src/components/Topbar.tsx'),d=r('desktop-tauri/src/pages/DashboardPage.tsx'),n=r('desktop-tauri/src/components/Sidebar.tsx'),sc=r('desktop-tauri/src/app-startup-motion.css'),cc=r('desktop-tauri/src/core-ui-v3.css'),rel=JSON.parse(r('release-versions.json')),suite=JSON.parse(r('scripts/test-suite-v2.json'));
assert.equal(rel.application,'5.7.0-beta.5');assert.equal(rel.firmware, '5.0.1-beta.1');
assert.ok(!h.includes('SOFT_NETWORK_WAIT_MS'));assert.ok(!h.includes('MAX_VISIBLE_MS'));assert.ok(!h.includes("state: 'pass', detailKey: 'startup.detail.backgroundContinue'"));assert.match(h,/connectionHealth\.state === 'healthy'/);assert.match(h,/update\('arduino', 'pending', 'startup\.detail\.arduinoBackground'\)/);assert.match(h,/verifiedCount/);assert.match(h,/pendingCount/);
assert.ok(!s.includes('`${progress}%`'));assert.match(s,/app-startup-truth-rail/);assert.match(s,/visual31-startup/);
assert.match(a,/startup\.verifiedCount/);assert.match(a,/deviceLabel=/);assert.match(t,/visual31-hud-telemetry/);assert.match(d,/systemHealthScore/);assert.match(d,/visual31-status-ribbon/);assert.match(n,/data-nav-active=/);
assert.ok(sc.includes('V683 — Visual 3.1 truthful startup'));assert.ok(cc.includes('V683 — Visual 3.1 MEGA 1 command center'));assert.equal(suite.current.includes('test:visual31-mega1'),true);
console.log('V683_TRUTHFUL_STARTUP_NO_FAKE_PASS=PASSED');console.log('V683_STARTUP_PERCENTAGE_REMOVED=PASSED');console.log('V683_RUNTIME_TELEMETRY_HUD=PASSED');console.log('V683_REAL_SYSTEM_HEALTH=PASSED');console.log('V683_STATUS_RIBBON=PASSED');console.log('V683_SIDEBAR_VISUAL_DEPTH=PASSED');console.log('V683_VISUAL31_MEGA1_CONTRACT=PASSED');
