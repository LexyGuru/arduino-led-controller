#!/usr/bin/env node
'use strict';
const a=require('node:assert/strict'),fs=require('node:fs');
const page=fs.readFileSync('desktop-tauri/src/pages/SettingsPage.tsx','utf8');
const app=fs.readFileSync('desktop-tauri/src/App.tsx','utf8');
a.match(page,/onPersist\?:\(config:ConnectionConfig\)=>void/);
a.match(page,/platform==='proxmox-lxc'/);
a.match(page,/persistentKeys=new Set<keyof ConnectionConfig>/);
a.match(page,/commit\(next,persistentKeys\.has\(key\)\)/);
a.match(page,/commit\(\{\.\.\.config,timezoneId,timezoneAuto,\.\.\.snap\},true\)/);
a.match(app,/onPersist=\{[\s\S]*saveConfig\(nextConfig\)/);
console.log('V701B_LXC_SETTINGS_AUTOSAVE_CALLBACK=PASSED');
console.log('V701B_CHANNEL_CHANGE_IMMEDIATE_PERSIST=PASSED');
console.log('V701B_TIMEZONE_CHANGE_IMMEDIATE_PERSIST=PASSED');
console.log('V701B_AUTOSAVE_USES_NEXT_CONFIG_SNAPSHOT=PASSED');
