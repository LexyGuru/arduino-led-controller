#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ino = fs.readFileSync('firmware/ArduinoLedController/ArduinoLedController.ino','utf8');
const release = JSON.parse(fs.readFileSync('firmware/firmware-release.json','utf8'));
const versions = JSON.parse(fs.readFileSync('release-versions.json','utf8'));
assert.match(ino, /#define FIRMWARE_VERSION "4\.3\.0-beta\.5"/);
assert.equal(release.firmwareVersion,'4.3.0-beta.5');
assert.equal(versions.firmware,'4.3.0-beta.5');
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
  '\\"schedulerSelectedIndex\\"'
]) assert.ok(ino.includes(token), `Hiányzó hotfix marker: ${token}`);
assert.doesNotMatch(ino, /manualOverrideUntilMinute\[led\] == MANUAL_OVERRIDE_INDEFINITE\)\s*return -1/);
assert.match(ino, /manualOverrideFallbackUntilMillis\[led\] = millis\(\) \+ MANUAL_OVERRIDE_UNSYNCED_MAX_MS/);
console.log('OK: firmware 4.3.0-beta.5 UDP NTP/timezone/scheduler contract');
