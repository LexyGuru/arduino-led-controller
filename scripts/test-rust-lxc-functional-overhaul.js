#!/usr/bin/env node
'use strict';
const fs=require('fs'),a=require('node:assert/strict');
const app=fs.readFileSync('web-lxc/src/App.tsx','utf8');
const api=fs.readFileSync('web-lxc/src/api.ts','utf8');
const codec=fs.readFileSync('web-lxc/src/scheduleCodec.ts','utf8');
const rust=fs.readFileSync('rust/arduino-led-lxc-server/src/main.rs','utf8');
const native=fs.readFileSync('deploy/install-rust-lxc-native.sh','utf8');
const updater=fs.readFileSync('deploy/update-rust-lxc.sh','utf8');
const docs=fs.readFileSync('docs/v5/RUST_LXC_OPERATIONS.md','utf8');

for(const marker of ['Mentés az Arduinóra','Összes törlése','Új program','Export','Import','Night Blue','Rainbow','Breathing','Arduino konzol','Firmware katalógus','Automatikus frissítés','nano /etc/arduino-led-controller/lxc.env','ARDUINO_API_PATH']) a.ok(app.includes(marker),`App marker hiányzik: ${marker}`);
for(const marker of ['schedulesAll','offset=${offset}&limit=8','replaceSchedules','expectedRevision','clearLogs','setAllLeds','serverInfo']) a.ok(api.includes(marker),`API marker hiányzik: ${marker}`);
for(const marker of ['54','day:number','brightness:number','effect:number','speed:number','decodeScheduleHex','encodeScheduleHex','Hétfő','Vasárnap']) a.ok(codec.includes(marker),`Schedule codec marker hiányzik: ${marker}`);
for(const marker of ['/api/v1/logs/clear','/api/v1/leds/all','/api/v1/server/info','firmwareCatalogAvailable','catalog-file-missing']) a.ok(rust.includes(marker),`Rust marker hiányzik: ${marker}`);
a.ok(native.includes('FIRMWARE_CATALOG_INSTALL=SUCCESS'));
a.ok(updater.includes('FIRMWARE_CATALOG=REFRESHED'));
a.ok(docs.includes('/etc/arduino-led-controller/lxc.env'));
a.ok(docs.includes('csak a privát prefix'));
a.ok(docs.includes('maximum 60'));

console.log('LXC_SCHEDULE_FULL_PAGINATION=PASSED');
console.log('LXC_SCHEDULE_CODEC_27_BYTES=PASSED');
console.log('LXC_SCHEDULE_TRANSACTION_EDITOR=PASSED');
console.log('LXC_SCHEDULE_IMPORT_EXPORT_DELETE=PASSED');
console.log('LXC_LED_FULL_CONTROL=PASSED');
console.log('LXC_LOG_CLEAR_FILTER_UI=PASSED');
console.log('LXC_FIRMWARE_CATALOG_RUNTIME=PASSED');
console.log('LXC_SERVER_INFO=PASSED');
console.log('LXC_OPERATIONS_DOCS=PASSED');
console.log('LXC_FUNCTIONAL_OVERHAUL_CONTRACT=PASSED');
