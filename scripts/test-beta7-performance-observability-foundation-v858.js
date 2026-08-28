#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8'); const release=JSON.parse(read('release-versions.json'));
assert.equal(read('VERSION').trim(),release.application); assert.match(release.application,/^\d+\.\d+\.\d+-beta\.\d+$/); assert.equal(release.firmware,'5.1.0-beta.4'); assert.equal(release.directApi,'1.2.0');
const fw=read('firmware/ArduinoLedController/ArduinoLedController.ino');
for(const m of ['HTTP_SLOW_REQUEST_THRESHOLD_MS = 250UL','perfHttpTotalDurationMs','perfHttpSlowRequests','wifiDisconnectCount','wifiReconnectCount','logDroppedCount','storeStructuredLog','logStructured','XP-HTTP-SLOW','XW-WIFI-DISCONNECT','XI-WIFI-CONNECT']) assert.ok(fw.includes(m),m);
assert.match(fw,/schemaVersion\\\":2/); assert.match(fw,/slowRequests\\\":%lu/); assert.match(fw,/levels\\\":\[\\\"TRACE/);
const types=read('desktop-tauri/src/types/index.ts'); assert.match(types,/DiagnosticLogLevel/); assert.match(types,/code\?: string/); assert.match(types,/subsystem\?: string/);
const panel=read('desktop-tauri/src/components/v55/DiagnosticsPanel.tsx'); assert.match(panel,/data-v858-http-average/); assert.match(panel,/data-v858-wifi-transitions/);
const rust=read('desktop-tauri/src-tauri/src/diagnostic_logging.rs'); assert.match(rust,/normalize_level/); assert.match(rust,/severity_rank/); assert.match(rust,/"source": "application"/);
console.log('V858_BETA7_IDENTITY=PASSED'); console.log('V858_FIRMWARE_STRUCTURED_LOGGING=PASSED'); console.log('V858_FIRMWARE_PERFORMANCE_METRICS=PASSED'); console.log('V858_WIFI_TRANSITION_DIAGNOSTICS=PASSED'); console.log('V858_HTTP_LATENCY_DIAGNOSTICS=PASSED'); console.log('V858_TAURI_STRUCTURED_LOGGING=PASSED'); console.log('V858_DESKTOP_DIAGNOSTICS_CONSUMPTION=PASSED');
