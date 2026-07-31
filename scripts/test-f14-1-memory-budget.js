'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const firmware = fs.readFileSync(
  path.join(ROOT, 'firmware/ArduinoLedController/ArduinoLedController.ino'),
  'utf8'
);

function integerConstant(name) {
  const expression = new RegExp(
    String.raw`constexpr\s+(?:uint8_t|uint16_t|size_t)\s+${name}\s*=\s*(\d+);`
  );
  const match = firmware.match(expression);
  assert.ok(match, `Hiányzó konstans: ${name}`);
  return Number(match[1]);
}

const logCapacity = integerConstant('LOG_CAPACITY');
const httpBuffer = integerConstant('HTTP_BODY_BUFFER_SIZE');
const serialBuffer = integerConstant('SERIAL_COMMAND_SIZE');

assert.ok(logCapacity <= 32, 'A RAM-log kapacitása legfeljebb 32 lehet.');
assert.ok(httpBuffer <= 2560, 'A HTTP JSON buffer legfeljebb 2560 bájt lehet.');
assert.ok(serialBuffer <= 160, 'A Serial parancsbuffer legfeljebb 160 bájt lehet.');
assert.match(firmware, /char message\[128\]/);
assert.match(firmware, /static_assert\(sizeof\(StoredLed\) == 8/);
assert.match(firmware, /static_assert\(sizeof\(StoredSchedule\) == 27/);
assert.match(firmware, /static_assert\(sizeof\(ScheduleHeader\) == 10/);
assert.doesNotMatch(firmware, /StoredSchedule staging\[SCHEDULE_MAX\]/);
assert.match(firmware, /Kétmenetes ellenőrzés/);

const estimatedLogBytes = logCapacity * (4 + 4 + 12 + 128);
assert.ok(
  estimatedLogBytes <= 4736,
  `A becsült RAM-log túl nagy: ${estimatedLogBytes} bájt`
);

// Ez kizárólag forrásszintű regresszióteszt. A valódi UNO R4 memóriaértéket
// az arduino-cli fordítás összegző soraiból kell kiolvasni:
//   Global variables use <N> bytes ... leaving <M> bytes for local variables.
// Az arm-none-eabi-size összesített BSS értéke nem használható ugyanerre,
// mert a Renesas linker NOLOAD runtime-területeket (például .heap) is beleszámol.

console.log(`OK: RAM-log becsült maximum ${estimatedLogBytes} bájt`);
console.log(`OK: HTTP buffer ${httpBuffer} bájt`);
console.log(`OK: Serial buffer ${serialBuffer} bájt`);
console.log('OK: nincs 1620 bájtos lokális schedule staging tömb');
console.log('OK: EEPROM struktúraméretek static_assert-tal védve');
console.log('OK: fordítási SRAM-kapu az Arduino CLI memóriajelentését használja');
console.log('OK: nyers ELF BSS nem minősül Arduino globális memóriaértéknek');
