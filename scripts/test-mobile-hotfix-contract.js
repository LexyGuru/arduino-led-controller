#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const read = (p) => fs.readFileSync(p, 'utf8');
const rust = read('desktop-tauri/src-tauri/src/lib.rs');
const settings = read('desktop-tauri/src/pages/SettingsPage.tsx');
const controller = read('desktop-tauri/src/hooks/useController.ts');
const app = read('desktop-tauri/src/App.tsx');
const sidebar = read('desktop-tauri/src/components/Sidebar.tsx');
const i18n = read('desktop-tauri/src/i18n/runtime.ts');

assert.match(rust, /ota_supported: !mobile/);
assert.match(rust, /Mobilalkalmazásból firmware-frissítés nem indítható/);
assert.match(rust, /Mobilalkalmazásban nincs OTA-művelet/);
assert.match(app, /!controller\.capabilities[\s\S]*?\.otaSupported[\s\S]*?page ===[\s\S]*?'firmware'/);
assert.match(sidebar, /item\.id\s*!==\s*['\"]firmware['\"]/);
assert.match(settings, /settings\.mobile\.title/);
assert.match(settings, /settings\.mobile\.notice/);
assert.match(i18n, /'settings\.mobile\.title': 'OTA firmware-frissítés letiltva'/);
assert.match(i18n, /Androidon és iOS-en az OTA telepítés, újratelepítés és rollback nem támogatott/);
assert.match(i18n, /'settings\.mobile\.title': 'OTA firmware update disabled'/);
assert.match(i18n, /'settings\.mobile\.title': 'OTA-Firmware-Update deaktiviert'/);
assert.match(rust, /cfg!\(any\(target_os = "android", target_os = "ios"\)\)[\s\S]*?serde_json::to_vec_pretty\(&config\)/);
assert.match(
  controller,
  /translate\(['"]controller\.mobileProfileSaved['"]\)/
);
assert.match(
  i18n,
  /["']controller\.mobileProfileSaved["']\s*:\s*["']Mobilos Arduino-kapcsolati profil és X-Device-Key tartósan mentve\./
);
assert.match(
  i18n,
  /["']controller\.mobileProfileSaved["']\s*:\s*["']Mobile Arduino connection profile and X-Device-Key saved permanently\./
);
assert.match(
  i18n,
  /["']controller\.mobileProfileSaved["']\s*:\s*["']Mobiles Arduino-Verbindungsprofil und X-Device-Key dauerhaft gespeichert\./
);
assert.match(rust, /SCHEDULE_AUTO_SYNC_FAILED/);
assert.match(rust, /let synchronized = fetch_schedule_snapshot\(&state\)\.await/);
assert.match(rust, /Az OTA sikeres, az újraindítás külön Boot ID-val nem volt igazolható/);
assert.doesNotMatch(rust, /return Err\("Az Arduino válaszol, de a Boot ID nem változott az OTA után/);
console.log('OK: mobil OTA backend és UI tiltás');
console.log('OK: mobilos profil és X-Device-Key app-private tartós mentése');
console.log('OK: schedule mentés automatikus előszinkronnal');
console.log('OK: változatlan Boot ID csak figyelmeztetés');
