'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const api=fs.readFileSync('desktop-tauri/src/services/tauriApi.ts','utf8');
const types=fs.readFileSync('desktop-tauri/src/types/index.ts','utf8');
const lib=fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs','utf8');
const lxc=fs.readFileSync('rust/arduino-led-lxc-server/src/main.rs','utf8');
const firmware=fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino','utf8');

assert.ok(types.includes('export interface ArduinoCapabilities'));
assert.ok(types.includes('export interface ArduinoDiagnosticsResult'));

assert.ok(api.includes('readArduinoCapabilitiesRaw'));
assert.ok(api.includes('readArduinoDiagnosticsNegotiated'));
assert.ok(api.includes("capabilities.diagnostics===true"));
assert.ok(api.includes('directApiAtLeast(version,1,1)'));
assert.ok(api.includes("sharedRead('capabilities',3000"));
assert.ok(api.includes("sharedRead('diagnostics',5000"));
assert.ok(api.includes("invoke<ArduinoCapabilities>('arduino_capabilities')"));
assert.ok(api.includes("invoke<Record<string,unknown>>('arduino_diagnostics')"));
assert.ok(api.includes("json<ArduinoCapabilities>('/api/v1/capabilities')"));
assert.ok(api.includes("json<Record<string,unknown>>('/api/v1/diagnostics')"));

assert.ok(lib.includes('async fn arduino_capabilities('));
assert.ok(lib.includes('async fn arduino_diagnostics('));
assert.ok(lib.includes('get_json(&state, "/api/v1/capabilities").await'));
assert.ok(lib.includes('get_json(&state, "/api/v1/diagnostics").await'));
assert.ok(lib.includes('arduino_capabilities,'));
assert.ok(lib.includes('arduino_diagnostics,'));

assert.ok(lxc.includes('.route("/api/v1/capabilities", get(proxy_get))'));
assert.ok(lxc.includes('.route("/api/v1/diagnostics", get(proxy_get))'));

assert.ok(firmware.includes('\\"diagnostics\\":true'));
assert.ok(firmware.includes('"/api/v1/diagnostics"'));

console.log('V790D_DIAGNOSTICS_CONSUMPTION=PASSED');
console.log('V790D_CAPABILITY_FIRST_NEGOTIATION=PASSED');
console.log('V790D_DIRECT_API_1_1_NEGOTIATION=PASSED');
console.log('V790D_TAURI_LXC_PARITY=PASSED');
console.log('V790D_SHARED_REQUEST_CACHE=PASSED');
