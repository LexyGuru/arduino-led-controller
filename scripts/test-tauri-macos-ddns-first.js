'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const profile=fs.readFileSync(
  'desktop-tauri/src/api/runtime/direct-arduino-profile-store.mjs',
  'utf8'
);
const types=fs.readFileSync(
  'desktop-tauri/src/types/index.ts',
  'utf8'
);
const settings=fs.readFileSync(
  'desktop-tauri/src/pages/SettingsPage.tsx',
  'utf8'
);
const i18n=fs.readFileSync(
  'desktop-tauri/src/i18n/runtime.ts',
  'utf8'
);
const controller=fs.readFileSync(
  'desktop-tauri/src/hooks/useController.ts',
  'utf8'
);
const rust=fs.readFileSync(
  'desktop-tauri/src-tauri/src/lib.rs',
  'utf8'
);
const cargo=fs.readFileSync(
  'desktop-tauri/src-tauri/Cargo.toml',
  'utf8'
);

for(const token of [
  'macosLocalApiEnabled',
  'settings.direct.macosNotice',
  'settings.macosLocalAdvanced',
  'settings.macosRemotePrimary'
]) {
  assert.ok(
    settings.includes(token),
    `Hiányzó Settings kulcs: ${token}`
  );
}

for(const token of [
  "'settings.macosRemotePrimary': 'macOS-en a távoli HTTPS/DDNS mindig elsődleges'",
  "'settings.macosRemotePrimary': 'Remote HTTPS/DDNS is always primary on macOS'",
  "'settings.macosRemotePrimary': 'Unter macOS ist HTTPS/DDNS immer primär'",
  "'settings.macosLocalAdvanced': 'Haladó: közvetlen helyi API engedélyezése macOS-en'",
  "'settings.macosLocalAdvanced': 'Advanced: enable direct local API on macOS'",
  "'settings.macosLocalAdvanced': 'Erweitert: direkte lokale API unter macOS aktivieren'"
]) {
  assert.ok(
    i18n.includes(token),
    `Hiányzó i18n macOS szerződés: ${token}`
  );
}

assert.ok(types.includes('macosLocalApiEnabled: boolean'));
assert.ok(controller.includes("platform === 'macos'"));
assert.ok(controller.includes('merged.preferLocal = false'));
assert.ok(profile.includes("platform==='macos'&&!profile.macosLocalApiEnabled"));
assert.ok(rust.includes('macos_local_api_enabled'));
assert.ok(rust.includes('macos_ddns_only'));
assert.ok(rust.includes('reqwest::blocking::Client'));
assert.ok(rust.includes('config.prefer_local = false'));
assert.ok(rust.includes('config.ota_use_api_host = false'));
assert.ok(cargo.includes('"blocking"'));

console.log(
  'OK: macOS DDNS-first API és opcionális helyi API szerződés'
);
console.log(
  'OK: külön helyi OTA-host és robusztus reqwest HTTP kliens'
);
console.log(
  'OK: magyar–angol–német macOS prioritásfordítás'
);
