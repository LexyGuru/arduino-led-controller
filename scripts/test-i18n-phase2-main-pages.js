#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const i18n=read('desktop-tauri/src/i18n/index.tsx');
const pages={
 dashboard:read('desktop-tauri/src/pages/DashboardPage.tsx'),
 leds:read('desktop-tauri/src/pages/LedsPage.tsx'),
 schedules:read('desktop-tauri/src/pages/SchedulesPage.tsx'),
 firmware:read('desktop-tauri/src/pages/FirmwarePage.tsx'),
 logs:read('desktop-tauri/src/pages/LogsPage.tsx')
};
for(const [name,source] of Object.entries(pages)){
 assert.ok(source.includes("useI18n"),`${name}: hiányzik useI18n`);
}
for(const key of [
 'dashboard.title','dashboard.loadedList','leds.title','leds.brightness',
 'schedules.title','schedules.saveArduino','schedules.deleteAll',
 'firmware.title','firmware.install','firmware.catalog',
 'logs.title','logs.consoleCache','days.1','daysShort.1','effects.0',
 'schedules.deleteToken','schedules.effect','schedules.exportShared',
 'schedules.conflictTitle','dashboard.scheduleCountMismatch','firmware.targetFromConfig'
]){
 const escaped=key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 assert.equal((i18n.match(new RegExp(`["']${escaped}["']`,'g'))||[]).length,3,`Nem mindhárom nyelven létezik: ${key}`);
}
assert.ok(pages.logs.includes("language === 'de'"));
assert.ok(pages.firmware.includes("language === 'de'"));
assert.ok(pages.dashboard.includes("dayKeys"));
assert.ok(pages.leds.includes("effectKeys"));
assert.ok(pages.schedules.includes("const dayKeys"));
assert.ok(pages.schedules.includes("const dayShortKeys"));
assert.ok(pages.schedules.includes("const effectKeys"));
assert.ok(pages.schedules.includes("t('schedules.deleteToken')"));
assert.ok(pages.schedules.includes("t('schedules.effect')"));
assert.ok(!pages.schedules.includes("const DAYS ="));
assert.ok(!pages.schedules.includes("const DAY_SHORT ="));
assert.ok(!pages.schedules.includes("const EFFECTS ="));
console.log('OK: Dashboard, LED, Schedule, Firmware és Logs i18n Phase 2');
console.log('OK: magyar–angol–német főoldali kulcslefedettség');
console.log('OK: locale-alapú dátum- és időformázás');
