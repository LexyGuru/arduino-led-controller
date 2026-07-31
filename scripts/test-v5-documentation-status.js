'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function main() {
  assert.strictEqual(read('VERSION').trim(), '5.0.0-beta.1');

  const checklist = read('docs/v5/V5_REARCHITECTURE_CHECKLIST.md');
  const status = read('docs/v5/V5_IMPLEMENTATION_STATUS.md');
  const known = read('docs/v5/BETA1_KNOWN_ISSUES.md');
  const execution = read('docs/v5/FIRMWARE_FIRST_EXECUTION_PLAN.md');
  const audit = read('docs/firmware/F14_0_FIRMWARE_AUDIT.md');
  const f141 = read('docs/firmware/F14_1_FIRMWARE_DIAGNOSTICS.md');
  const serial = read('docs/firmware/ARDUINO_SERIAL_COMMAND_CONTRACT.md');
  const hardware = read('docs/firmware/ARDUINO_HARDWARE_ACCEPTANCE_MATRIX.md');
  const firmware = read('firmware/ArduinoLedController/ArduinoLedController.ino');

  for (const marker of [
    'bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b',
    '295713798b1487ec2c788b170be2fce32fccea2a',
    '5.0.0-alpha.3'
  ]) {
    assert.ok(checklist.includes(marker) || status.includes(marker));
  }

  assert.match(checklist, /F14\.1 diagnosztika.*forrás/);
  assert.match(checklist, /F14\.1 Arduino CLI fordítás/);
  assert.match(checklist, /F14\.4 hardveres stabilitási gate/);
  assert.match(checklist, /SZÜNETEL F14\.4-IG/);
  assert.match(status, /Firmware-first döntés/);
  assert.match(status, /F14\.1 forrásimplementáció/);
  assert.match(known, /F14\.1 javítási állapot/);
  assert.match(execution, /Tauri V15 belépési feltétel/);
  assert.match(audit, /Auditált firmware:[^\n]*`4\.1\.21`/);
  assert.match(f141, /4\.2\.0-beta\.1/);
  assert.match(serial, /hardveres validáció következik/);
  assert.match(hardware, /hardveres mérésig nyitva/);
  assert.match(firmware, /#define FIRMWARE_VERSION "4\.2\.0-beta\.1"/);
  assert.match(checklist, /Beolvasztás `main` ágba/);
  assert.match(status, /Tilos \/ korai/);

  console.log('OK: alkalmazásverzió 5.0.0-beta.1');
  console.log('OK: történeti Alpha.2/Alpha.3 bizonyítékok megmaradtak');
  console.log('OK: F14.0 audit történeti 4.1.21 dokumentum');
  console.log('OK: F14.1 firmware-forrás 4.2.0-beta.1');
  console.log('OK: Arduino CLI és hardveres kapuk nyitva maradtak');
  console.log('OK: Tauri fejlesztés F14.4-ig szünetel');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
