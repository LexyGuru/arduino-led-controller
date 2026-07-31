'use strict';
const assert=require('assert');const fs=require('fs');
const f=fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino','utf8');
assert.match(f,/CONFIG_SLOT_A_OFFSET = 0/);assert.match(f,/CONFIG_SLOT_B_OFFSET = 384/);
assert.match(f,/SCHEDULE_SLOT_A_OFFSET = 768/);assert.match(f,/SCHEDULE_SLOT_B_OFFSET = 2560/);
assert.match(f,/SCHEDULE_SLOT_SIZE = 1792/);assert.match(f,/readbackAfterWrite\\\":true/);
console.log('OK: A/B EEPROM layout and readback contract');
