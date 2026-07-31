'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

const firmware = read('firmware/ArduinoLedController/ArduinoLedController.ino');
const audit = read('docs/firmware/F14_0_FIRMWARE_AUDIT.md');
const apiContract = read('docs/firmware/ARDUINO_DIRECT_API_V1_CONTRACT.md');
const eeprom = read('docs/firmware/ARDUINO_EEPROM_LAYOUT_4_1_21.md');
const serial = read('docs/firmware/ARDUINO_SERIAL_COMMAND_CONTRACT.md');
const hardware = read('docs/firmware/ARDUINO_HARDWARE_ACCEPTANCE_MATRIX.md');
const execution = read('docs/v5/FIRMWARE_FIRST_EXECUTION_PLAN.md');
const openapi = JSON.parse(read('docs/api/arduino-direct-api-v1.json'));

assert.match(audit, /Auditált firmware:[^\n]*`4\.1\.21`/);
assert.match(audit, /F14-AUD-001/);
assert.match(audit, /hibás konzol-URL/i);
assert.match(audit, /néma útvonal- és metóduselutasítás/i);
assert.match(audit, /schedule header kerül először EEPROM-ba/i);
assert.match(audit, /chunk import közvetlenül az aktív RAM-ba ír/i);

assert.match(firmware, /#define FIRMWARE_VERSION "4\.2\.0-beta\.1"/);
assert.match(firmware, /PRIVATE_PATH_NOT_FOUND/);
assert.match(firmware, /METHOD_NOT_ALLOWED/);
assert.match(firmware, /\/api\/v1\/status/);
assert.match(firmware, /profile export secrets/);

assert.match(eeprom, /A\/B/);
assert.match(firmware, /abSlots\\":false/);
assert.match(firmware, /readbackAfterWrite\\":false/);
assert.match(apiContract, /X-Device-Key/);
assert.match(apiContract, /\/api\/v1/);
assert.match(serial, /profile export secrets/);
assert.match(hardware, /1000 egymás utáni statuszkérés/);
assert.match(execution, /Tauri V15 belépési feltétel/);
assert.strictEqual(openapi.openapi, '3.1.0');
assert.ok(openapi.paths['/api/v1/status']);

console.log('OK: F14.0 audit történeti 4.1.21 bizonyítéka megmaradt');
console.log('OK: aktív firmware F14.1 4.2.0-beta.1');
console.log('OK: Direct API v1 diagnosztikai alap implementálva');
console.log('OK: F14.3 A/B EEPROM továbbra is nyitott');
