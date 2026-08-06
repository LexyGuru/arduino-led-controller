"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const firmware=fs.readFileSync("desktop-tauri/src/pages/FirmwarePage.tsx","utf8");
const settings=fs.readFileSync("desktop-tauri/src/pages/SettingsPage.tsx","utf8");
const lib=fs.readFileSync("desktop-tauri/src-tauri/src/lib.rs","utf8");
const css=fs.readFileSync("desktop-tauri/src/beta7-theme.css","utf8");
const i18n=fs.readFileSync("desktop-tauri/src/i18n/index.tsx","utf8");
assert.doesNotMatch(firmware,/globalThis\.confirm/);
assert.match(firmware,/pendingInstallVersion/);
assert.match(firmware,/firmware\.confirmInstallButton/);
assert.doesNotMatch(settings,/checked=\{config\.otaUseApiHost\}\s+disabled=\{isMac\}/);
assert.match(settings,/ota-terminal-toggle/);
assert.match(settings,/value="bundled" disabled=\{isMac\}/);
assert.match(lib,/macOS-en az UNO R4 OTA-frissítéshez/);
assert.match(lib,/macos_ota_modes_resolve_to_terminal_tool/);
assert.match(css,/direct V5_BACKUP_LIST token override/);
assert.match(css,/html\[data-appearance='light'\] \.v5-backup-list>article/);
for(const key of["settings.ota.localConsole","settings.ota.localConsoleHelp","firmware.confirmInstallButton"]){
 const c=(i18n.match(new RegExp(`['"]${key.replaceAll(".","\\.")}['"]\\s*:`,`g`))||[]).length;
 assert.equal(c,3,`${key}: parity`);
}
console.log("OK: macOS UNO R4 OTA kizárólag helyi arduinoOTA Terminal útvonal");
console.log("OK: dialog nélküli kétlépcsős megerősítés és közvetlen V5_BACKUP_LIST kontraszt");
