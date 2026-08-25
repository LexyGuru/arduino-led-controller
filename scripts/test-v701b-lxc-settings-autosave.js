#!/usr/bin/env node
'use strict';
const a=require('node:assert/strict'),fs=require('node:fs');
const page=fs.readFileSync('desktop-tauri/src/pages/SettingsPage.tsx','utf8');
const app=fs.readFileSync('desktop-tauri/src/App.tsx','utf8');
a.match(page,/onPersist\s*\?:\s*\(\s*config\s*:\s*ConnectionConfig\s*\)\s*=>\s*void/);
a.match(page,/platform\s*===\s*'proxmox-lxc'/);
a.match(page,/persistentKeys\s*=\s*new Set<keyof ConnectionConfig>/);
a.match(page,/commit\(\s*next\s*,\s*persistentKeys\.has\(\s*key\s*\)\s*\)/);
a.match(page,/commit\(\s*\{\s*\.\.\.config\s*,\s*timezoneId\s*,\s*timezoneAuto\s*,\s*\.\.\.snap\s*\}\s*,\s*true\s*\)/);
a.match(app,/onPersist=\{[\s\S]*saveConfig\(nextConfig\)/);
console.log('V701B_LXC_SETTINGS_AUTOSAVE_CALLBACK=PASSED');
console.log('V701B_CHANNEL_CHANGE_IMMEDIATE_PERSIST=PASSED');
console.log('V701B_TIMEZONE_CHANGE_IMMEDIATE_PERSIST=PASSED');
console.log('V701B_AUTOSAVE_USES_NEXT_CONFIG_SNAPSHOT=PASSED');
