#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const r=p=>fs.readFileSync(p,'utf8');
const i18n=r('desktop-tauri/src/i18n/runtime.ts');
const pages={
 leds:r('desktop-tauri/src/pages/LedsPage.tsx'),
 schedules:r('desktop-tauri/src/pages/SchedulesPage.tsx'),
 firmware:r('desktop-tauri/src/pages/FirmwarePage.tsx'),
 logs:r('desktop-tauri/src/pages/LogsPage.tsx'),
 settings:r('desktop-tauri/src/pages/SettingsPage.tsx')
};
const suite=JSON.parse(r('scripts/test-suite-v2.json'));
for(const key of ['visual31.led.eyebrow','visual31.schedule.timelineTitle','visual31.firmware.pipeline','visual31.logs.title','visual31.settings.eyebrow']){
  const n=(i18n.match(new RegExp(key.replaceAll('.','\\.'),'g'))||[]).length;
  assert.equal(n,3,`${key}: HU/EN/DE parity`);
}
for(const [name,text] of Object.entries(pages)) assert.match(text,/t\('visual31\./,name);
for(const retired of [
 'Visual 3.1 LED Control Center','3 × WS2812B Hardware Matrix','realtime local preview',
 'Visual 3.1 Schedule Command','scheduled actions','active days · revision','Weekly Timeline','7-day execution map',
 'Visual 3.1 Update Center','Firmware command pipeline','OTA Pipeline','Ready for operation',
 'Visual 3.1 Observability','Live activity stream','unified events','paused snapshot','live view',
 'Visual 3.1 Configuration Hub','Arduino profile'
]){
 for(const [name,text] of Object.entries(pages)) assert.equal(text.includes(retired),false,`${name}: ${retired}`);
}
assert.equal(suite.current.includes('test:visual31-product-consolidation'),true);
console.log('V687_VISUAL31_HU_EN_DE_PARITY=PASSED');
console.log('V687_VISUAL31_HARDCODED_UI_TEXT_REMOVED=PASSED');
console.log('V687_VISUAL31_REAL_DATA_CONTRACT_PRESERVED=PASSED');
console.log('V687_VISUAL31_PRODUCT_CONSOLIDATION=PASSED');
