'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const tauriRust = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs', 'utf8');
const sharedRust = fs.readFileSync('rust/arduino-led-core/src/lib.rs', 'utf8');
const rust = `${tauriRust}\n${sharedRust}`;
const types = fs.readFileSync('desktop-tauri/src/types/index.ts', 'utf8');
const settings = fs.readFileSync('desktop-tauri/src/pages/SettingsPage.tsx', 'utf8');
const i18n = fs.readFileSync('desktop-tauri/src/i18n/runtime.ts', 'utf8');
const controller = fs.readFileSync('desktop-tauri/src/hooks/useController.ts', 'utf8');
const profile = fs.readFileSync('desktop-tauri/src/api/runtime/direct-arduino-profile-store.mjs', 'utf8');
const firmware = fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino', 'utf8');

for (const token of [
  'local_protocol: String',
  'protocol: "https".into()',
  'arduino_port: 443',
  'local_protocol: "http".into()',
  'reqwest::Method::from_bytes',
  'request_json(',
  'post_json(',
  'put_json(',
  'delete_json(',
  '"{}://{}:{}{}"',
  '"/api/v1/status"',
  '"/api/v1/logs?afterId={after_id}"',
  '"/api/v1/leds/{id}"',
  '"/api/v1/schedules?offset={offset}&limit=8"',
  '"/api/v1/schedules/transactions"',
  '"{tx_base}/chunks"',
  '"{tx_base}/commit"',
  '"/api/v1/ota/prepare"',
  '"/api/v1/ota/status"',
  'ota_request_allowed_while_busy'
]) assert.ok(rust.includes(token), `Hiányzó Rust szerződés: ${token}`);

for (const token of [
  "protocol: 'https'",
  "localProtocol: 'http'",
  'arduinoPort: 443',
]) assert.ok(controller.includes(token), `Hiányzó alapbeállítás: ${token}`);

assert.ok(types.includes("localProtocol: 'http' | 'https'"));

for (const token of [
  "settings.remoteProtocol",
  "settings.localProtocol",
  '${config.localProtocol}://',
  '${config.protocol}://',
  '/api/v1/status'
]) assert.ok(settings.includes(token), `Hiányzó UI-szerződés: ${token}`);

for (const token of [
  "'settings.remoteProtocol': 'Távoli protokoll'",
  "'settings.remoteProtocol': 'Remote protocol'",
  "'settings.remoteProtocol': 'Entferntes Protokoll'",
  "'settings.localProtocol': 'Helyi protokoll'",
  "'settings.localProtocol': 'Local protocol'",
  "'settings.localProtocol': 'Lokales Protokoll'"
]) assert.ok(i18n.includes(token), `Hiányzó i18n UI-szerződés: ${token}`);

for (const token of [
  "protocol: 'https'",
  "localProtocol: 'http'",
  'remotePort: 443',
  'profile.localProtocol',
  'profile.protocol'
]) assert.ok(profile.includes(token), `Hiányzó profil-szerződés: ${token}`);

for (const token of [
  'pathEquals(base, "/api/v1/status") && pathEquals(method, "GET")',
  'pathEquals(base, "/api/v1/logs") && pathEquals(method, "GET")',
  'pathStartsWith(base, LED_PREFIX)',
  'pathEquals(base, "/api/v1/schedules") && pathEquals(method, "GET")',
  'pathEquals(base, "/api/v1/schedules/transactions") && pathEquals(method, "POST")',
  'pathEquals(action, "chunks") && pathEquals(method, "PUT")',
  'pathEquals(action, "commit") && pathEquals(method, "POST")',
  'pathEquals(base, "/api/v1/ota/prepare") && pathEquals(method, "POST")',
  'pathEquals(base, "/api/v1/ota/status") && pathEquals(method, "GET")'
]) assert.ok(firmware.includes(token), `A firmware nem támogatja: ${token}`);

assert.ok(!rust.includes('"/api/console/logs?after='));
assert.ok(!rust.includes('"/api/led/{id}?enabled='));
assert.ok(!rust.includes('"/api/schedules/chunk?'));

console.log('OK: külön HTTPS távoli és HTTP helyi Arduino-cél');
console.log('OK: valós protokoll jelenik meg a hálózati naplóban');
console.log('OK: általános GET/POST/PUT/DELETE JSON-kliens');
console.log('OK: Direct API v1 status, logs és LED végpontok');
console.log('OK: lapozott schedule-letöltés és tranzakciós feltöltés/readback');
console.log('OK: OTA prepare/status nincs blokkolva az ota_in_progress kapun');
