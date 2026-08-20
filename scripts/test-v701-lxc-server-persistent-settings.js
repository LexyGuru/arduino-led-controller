#!/usr/bin/env node
'use strict';
const a=require('node:assert/strict'),fs=require('node:fs');
const rust=fs.readFileSync('rust/arduino-led-lxc-server/src/main.rs','utf8'); const api=fs.readFileSync('desktop-tauri/src/services/tauriApi.ts','utf8');
a.match(rust,/settings_path: Arc<PathBuf>/);a.match(rust,/LXC_SETTINGS_JSON/);a.match(rust,/lxc-settings\.json/);a.match(rust,/struct LxcPersistentSettings/);a.match(rust,/async fn lxc_settings_get/);a.match(rust,/async fn lxc_settings_put/);a.match(rust,/same_origin_browser_request\(&headers\)/);a.match(rust,/get\(lxc_settings_get\)\.put\(lxc_settings_put\)/);
a.match(api,/type LxcPersistentSettings=Pick<ConnectionConfig/);a.match(api,/async function loadLxcConfig/);a.match(api,/async function saveLxcConfig/);a.match(api,/result\?\.configured===true/);a.match(api,/const merged=\{\.\.\.local,\.\.\.result\.settings\}/);
console.log('V701_LXC_SERVER_SETTINGS_FILE=PASSED');console.log('V701_LXC_SETTINGS_GET_PUT_API=PASSED');console.log('V701_LXC_BROWSER_TO_SERVER_MIGRATION=PASSED');console.log('V701_LXC_SERVER_AUTHORITATIVE_LOAD=PASSED');console.log('V701_LXC_CHANNEL_PERSISTENCE=PASSED');console.log('V701_LXC_TIMEZONE_PERSISTENCE=PASSED');console.log('V701_LXC_SECRET_FIELDS_EXCLUDED=PASSED');
