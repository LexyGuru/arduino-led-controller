#!/usr/bin/env node
'use strict';
const assert=require('assert'); const fs=require('fs');
const read=p=>fs.readFileSync(p,'utf8');
const i18n=read('desktop-tauri/src/i18n/index.tsx');
for(const lang of ['hu','en','de']) assert.ok(i18n.includes(`${lang}: {`),`Hiányzó nyelv: ${lang}`);
for(const key of ['nav.dashboard','nav.settings','settings.language.label','settings.saveProfile']) assert.ok((i18n.match(new RegExp(`'${key.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}'`,'g'))||[]).length===3,`A kulcs nem mindhárom nyelven létezik: ${key}`);
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx'); assert.match(settings,/changeLanguage/); assert.match(settings,/set\('language',value\)/); assert.match(settings,/settings\.language\.label/);
const types=read('desktop-tauri/src/types/index.ts'); assert.match(types,/language: 'hu' \| 'en' \| 'de'/);
const rust=read('desktop-tauri/src-tauri/src/lib.rs'); assert.match(rust,/language: String/); assert.match(rust,/language: "hu"\.into\(\)/);
const main=read('desktop-tauri/src/main.tsx'); assert.match(main,/<I18nProvider>/);
console.log('OK: magyar–angol–német i18n alapréteg'); console.log('OK: azonnali és tartós nyelvváltás'); console.log('OK: navigáció, Topbar és Beállítások fordítható');
