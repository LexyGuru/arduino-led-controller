#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');
const i18n=read('desktop-tauri/src/i18n/runtime.ts');
for(const token of ['export function translate','activeLanguage = next','activeLanguage = language']) assert.ok(i18n.includes(token),token);
const hooks=['useController.ts','useV5Leds.ts','useV5Logs.ts','useV5Schedules.ts','useV5Firmware.ts','useV5System.ts'];
for(const name of hooks){const source=read(`desktop-tauri/src/hooks/${name}`);assert.ok(source.includes("import { translate } from '../i18n';"),`Hiányzó translate import: ${name}`);}
for(const key of ['controller.ready','controller.connected','controller.schedulesUploaded','controller.otaError','v5led.sent','v5logs.authRequired','v5schedule.saved','v5firmware.accepted','v5system.snapshotRestored']){
 const count=(i18n.match(new RegExp(`["']${key.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\$&')}["']`,'g'))||[]).length;
 assert.equal(count,3,`Nem háromnyelvű kulcs: ${key}`);
}
const forbidden=['Készen áll','Arduino nem érhető el:','Firmware-ellenőrzési hiba:','LED vezérlés visszaállítva','A firmware-frissítés elfogadva','Rendszer-snapshot elkészült.'];
const combined=hooks.map(n=>read(`desktop-tauri/src/hooks/${n}`)).join('\n');
for(const text of forbidden) assert.ok(!combined.includes(text),`Beégetett hook üzenet maradt: ${text}`);
console.log('OK: a hook státusz- és műveleti üzenetek központi i18n rétegen futnak');
console.log('OK: HU/EN/DE végső üzenetkulcsok elérhetők');
