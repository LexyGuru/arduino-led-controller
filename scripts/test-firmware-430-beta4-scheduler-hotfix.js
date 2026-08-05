#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const ino = fs.readFileSync(
  'firmware/ArduinoLedController/ArduinoLedController.ino',
  'utf8',
);
const release = JSON.parse(
  fs.readFileSync('firmware/firmware-release.json', 'utf8'),
);
const versions = JSON.parse(
  fs.readFileSync('release-versions.json', 'utf8'),
);

assert.ok(
  ino.includes(`#define FIRMWARE_VERSION "${versions.firmware}"`),
  'A firmware forrásverzió nem egyezik a központi verzióval',
);
assert.ok(
  ino.includes(`#define DIRECT_API_VERSION "${versions.directApi}"`),
  'A Direct API forrásverzió nem egyezik a központi verzióval',
);
assert.equal(release.firmwareVersion, versions.firmware);
assert.equal(release.directApiVersion, versions.directApi);

for (const token of [
  'MANUAL_OVERRIDE_UNSYNCED_MAX_MS',
  'NTP_SYNC_INTERVAL_MS',
  'NTP_VALID_EPOCH_MIN',
  'WiFiUDP ntpUdp',
  'readAnyUdpNtp',
  'NTP_SERVERS',
  'TIME_SETTINGS_EEPROM_OFFSET',
  '/api/v1/time/config',
  'serviceClockSync(false)',
  'ntpAttemptCount++',
  'ntpFailureCount++',
  'ntpSuccessCount++',
  'clockWifiWasAvailable',
  'manualOverrideFallbackUntilMillis',
  'reconcileArduinoSchedules(true)',
  'schedulerLastSelectedIndex',
  'schedulerLastBlockedReason',
  '\\"clockEpoch\\"',
  '\\"ntpAttemptCount\\"',
  '\\"schedulerSelectedIndex\\"',
  'centralEuropeanTimezoneState',
  'refreshAutonomousTimezoneState',
  'void printTimeStatus()',
]) {
  assert.ok(ino.includes(token), `Hiányzó scheduler/time marker: ${token}`);
}

assert.doesNotMatch(
  ino,
  /manualOverrideUntilMinute\[led\] == MANUAL_OVERRIDE_INDEFINITE\)\s*return -1/,
);
assert.match(
  ino,
  /manualOverrideFallbackUntilMillis\[led\] = millis\(\) \+ MANUAL_OVERRIDE_UNSYNCED_MAX_MS/,
);

console.log(
  `OK: firmware ${versions.firmware} UDP NTP/timezone/scheduler contract`,
);
