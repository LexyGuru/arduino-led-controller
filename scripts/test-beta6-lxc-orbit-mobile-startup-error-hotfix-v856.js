#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const release=JSON.parse(read('release-versions.json'));
assert.equal(release.application,'6.0.0-beta.6');
assert.equal(release.firmware,'5.1.0-beta.3');
assert.equal(release.directApi,'1.1.0');

const css=read('desktop-tauri/src/core-ui-v3.css');
assert.match(css,/V856 - Beta\.6 health orbit text containment hotfix/);
assert.match(css,/\.visual31-health-orbit small \{[\s\S]*width: min\(68px, 100%\);[\s\S]*font-size: 8px;[\s\S]*white-space: normal;[\s\S]*overflow-wrap: anywhere;/);
assert.match(css,/@media \(max-width: 520px\) \{[\s\S]*\.visual31-health-orbit small \{[\s\S]*width: min\(58px, 100%\);[\s\S]*font-size: 7\.5px;/);

const dash=read('desktop-tauri/src/pages/DashboardPage.tsx');
const health=read('desktop-tauri/src/components/v55/DeviceHealthPanel.tsx');
const app=read('desktop-tauri/src/App.tsx');

for(const source of [dash,health]){
  assert.match(source,/recoveredCredentialBootstrap/);
  assert.match(source,/state === 'healthy'/);
  assert.match(source,/Az Arduino API-kulcs nem használható biztonságos HTTP-fejlécértékként\./);
  assert.doesNotMatch(source,/recoveredMacCredentialBootstrap/);
}
assert.doesNotMatch(dash,/platform === 'macos'/);
assert.doesNotMatch(health,/platform === 'macos'/);
const dashboardStart=app.indexOf('<DashboardPage');
const dashboardEnd=dashboardStart>=0?app.indexOf('/>',dashboardStart):-1;
const settingsStart=app.indexOf('<SettingsPage');
const settingsEnd=settingsStart>=0?app.indexOf('/>',settingsStart):-1;
assert.ok(dashboardStart>=0&&dashboardEnd>dashboardStart,'DashboardPage JSX block missing');
assert.ok(settingsStart>=0&&settingsEnd>settingsStart,'SettingsPage JSX block missing');
const dashboardBlock=app.slice(dashboardStart,dashboardEnd);
const settingsBlock=app.slice(settingsStart,settingsEnd);
assert.doesNotMatch(dashboardBlock,/platform=\{controller\.capabilities\.platform\}/);
assert.match(settingsBlock,/platform=\{controller\.capabilities\.platform\}/);
assert.match(health,/beta2\.health\.lastError/);
assert.match(health,/effectiveHealthError/);
assert.match(health,/effectiveNetworkError/);

console.log('V856_LXC_HEALTH_ORBIT_TEXT_CONTAINMENT=PASSED');
console.log('V856_MOBILE_RECOVERED_BOOTSTRAP_ERROR_SUPPRESSED=PASSED');
console.log('V856_REAL_RUNTIME_ERRORS_REMAIN_VISIBLE=PASSED');
console.log('V856_SCOPED_PLATFORM_PROP_CONTRACT=PASSED');
console.log('V856_CROSS_PLATFORM_RECOVERED_ERROR_POLICY=PASSED');
console.log('V856_BETA6_IDENTITY=PASSED');
