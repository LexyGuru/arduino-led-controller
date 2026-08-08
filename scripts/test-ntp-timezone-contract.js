#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const fw = fs.readFileSync(
  'firmware/ArduinoLedController/ArduinoLedController.ino',
  'utf8',
);
const rust = fs.readFileSync(
  'desktop-tauri/src-tauri/src/lib.rs',
  'utf8',
);
const types = fs.readFileSync(
  'desktop-tauri/src/types/index.ts',
  'utf8',
);
const api = fs.readFileSync(
  'desktop-tauri/src/services/tauriApi.ts',
  'utf8',
);
const settings = fs.readFileSync(
  'desktop-tauri/src/pages/SettingsPage.tsx',
  'utf8',
);
const readme = fs.readFileSync('README.md', 'utf8');
const versions = JSON.parse(
  fs.readFileSync('release-versions.json', 'utf8'),
);
const release = JSON.parse(
  fs.readFileSync('firmware/firmware-release.json', 'utf8'),
);

assert.ok(
  fw.includes(`#define FIRMWARE_VERSION "${versions.firmware}"`),
  'A firmware forrásverzió nem egyezik a release-versions.json értékével',
);
assert.ok(
  fw.includes(`#define DIRECT_API_VERSION "${versions.directApi}"`),
  'A Direct API forrásverzió nem egyezik a release-versions.json értékével',
);
assert.equal(release.firmwareVersion, versions.firmware);
assert.equal(release.directApiVersion, versions.directApi);

for (const host of [
  '0.europe.pool.ntp.org',
  '1.europe.pool.ntp.org',
  'time.apple.com',
  'time.cloudflare.com',
  'time.google.com',
  'pool.ntp.org',
  '0.pool.ntp.org',
  '1.pool.ntp.org',
]) {
  assert.ok(fw.includes(host), `Hiányzó NTP szerver: ${host}`);
}

for (const marker of [
  'WiFiUDP ntpUdp',
  'readAnyUdpNtp',
  '/api/v1/time/config',
  'TIME_SETTINGS_EEPROM_OFFSET',
  'int64_t daysFromCivil',
  'lastSundayOfMonth',
  'centralEuropeanTimezoneState',
  'autonomousTimezoneState',
  'refreshAutonomousTimezoneState',
  'void printTimeStatus()',
  'ARDUINO-CET/CEST',
  'A/B slots: IMPLEMENTED',
  '\\"abSlots\\":true',
  '\\"readbackAfterWrite\\":true',
]) {
  assert.ok(fw.includes(marker), `Hiányzó firmware marker: ${marker}`);
}

assert.match(rust, /sync_time_config/);
assert.match(types, /timezoneId: string/);
assert.match(api, /syncTimeConfig/);
assert.match(settings, /resolvedOptions\(\)\.timeZone/);

// README current-state contract: Beta.8 + dynamic GitHub Actions badges.
assert.ok(
  readme.includes(
    'firmware-beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture',
  ),
  'Hiányzó dinamikus Firmware Beta workflow badge',
);
assert.ok(
  readme.includes(
    'beta-release.yml/badge.svg?branch=next%2Fv5-rearchitecture',
  ),
  'Hiányzó dinamikus V5 Beta workflow badge',
);
assert.ok(readme.includes('actions/workflows/firmware-beta-release.yml'));
assert.ok(readme.includes('actions/workflows/beta-release.yml'));

for (const marker of [
  '5.0.0-beta.8',
  '5.0.0-beta.6',
  'next/v5-rearchitecture',
  'Stabil ág | `main`',
  'Debian 13 Rust LXC',
  'React/Vite',
  'automatikus frissítés',
]) {
  assert.ok(
    readme.includes(marker),
    `README aktuális Beta.8 marker hiányzik: ${marker}`,
  );
}

assert.ok(
  !readme.includes('feature/beta7-ui-overhaul'),
  'A fő README nem nevezheti aktív fejlesztési ágnak a történeti Beta.7 feature ágat',
);
assert.ok(
  !readme.includes('img.shields.io/badge/Firmware_Beta-release-blue'),
  'A fő README-ben nem maradhat statikus Firmware Beta Shields badge',
);
assert.ok(
  !readme.includes('img.shields.io/badge/V5_Beta-release-blue'),
  'A fő README-ben nem maradhat statikus V5 Beta Shields badge',
);

function daysFromCivil(year, month, day) {
  year -= month <= 2 ? 1 : 0;
  const era = Math.floor((year >= 0 ? year : year - 399) / 400);
  const yoe = year - era * 400;
  const adjustedMonth = month + (month > 2 ? -3 : 9);
  const doy =
    Math.floor((153 * adjustedMonth + 2) / 5) + day - 1;
  const doe =
    yoe * 365 + Math.floor(yoe / 4) -
    Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

function utcEpoch(year, month, day, hour = 0, minute = 0) {
  return (
    daysFromCivil(year, month, day) * 86400 +
    hour * 3600 +
    minute * 60
  );
}

function weekdaySundayZero(year, month, day) {
  const value = (daysFromCivil(year, month, day) + 4) % 7;
  return value < 0 ? value + 7 : value;
}

function daysInMonth(year, month) {
  if (month !== 2) {
    return [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
      month - 1
    ];
  }
  const leap =
    (year % 4 === 0 && year % 100 !== 0) ||
    year % 400 === 0;
  return leap ? 29 : 28;
}

function lastSunday(year, month) {
  const last = daysInMonth(year, month);
  return last - weekdaySundayZero(year, month, last);
}

function centralEuropeanState(epoch) {
  const date = new Date(epoch * 1000);
  const year = date.getUTCFullYear();
  const spring = utcEpoch(year, 3, lastSunday(year, 3), 1);
  const autumn = utcEpoch(year, 10, lastSunday(year, 10), 1);

  if (epoch < spring) {
    return {
      offset: 60,
      nextTransition: spring,
      nextOffset: 120,
      dst: false,
    };
  }
  if (epoch < autumn) {
    return {
      offset: 120,
      nextTransition: autumn,
      nextOffset: 60,
      dst: true,
    };
  }
  return {
    offset: 60,
    nextTransition: utcEpoch(
      year + 1,
      3,
      lastSunday(year + 1, 3),
      1,
    ),
    nextOffset: 120,
    dst: false,
  };
}

const cases = [
  ['winter', utcEpoch(2026, 1, 15, 12), 60, false],
  ['spring-before', utcEpoch(2026, 3, 29, 0, 59), 60, false],
  ['spring-at', utcEpoch(2026, 3, 29, 1, 0), 120, true],
  ['summer', utcEpoch(2026, 8, 5, 2, 39), 120, true],
  ['autumn-before', utcEpoch(2026, 10, 25, 0, 59), 120, true],
  ['autumn-at', utcEpoch(2026, 10, 25, 1, 0), 60, false],
  ['winter-end', utcEpoch(2026, 12, 15, 12), 60, false],
];

for (const [name, epoch, expectedOffset, expectedDst] of cases) {
  const state = centralEuropeanState(epoch);
  assert.equal(state.offset, expectedOffset, `${name}: offset`);
  assert.equal(state.dst, expectedDst, `${name}: DST`);
}

assert.equal(lastSunday(2026, 3), 29);
assert.equal(lastSunday(2026, 10), 25);
assert.ok(fw.includes('"Europe/Vienna"'));
assert.ok(fw.includes('"Europe/Budapest"'));
assert.ok(fw.includes('"Europe/Berlin"'));
assert.ok(!fw.includes('"America/New_York"'));


for (const file of [
  'README.md',
  'docs/v5/BETA7_CURRENT_STATE.md',
  'docs/v5/BETA7_UI_FREEZE.md',
]) {
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(
    content.includes(versions.firmware),
    `${file}: current Beta.7 firmware version mismatch`,
  );
}

for (const file of [
  'docs/v5/BETA6_RELEASE_NOTES.md',
  'docs/v5/BETA6_INSTALLATION_GUIDE.md',
  'docs/v5/BETA6_RELEASE_CHECKLIST.md',
]) {
  const content = fs.readFileSync(file, 'utf8');
  assert.ok(
    content.includes('4.3.0-beta.6'),
    `${file}: historical Beta.6 firmware pairing changed`,
  );
  assert.ok(
    content.includes('5.0.0-beta.6'),
    `${file}: historical Beta.6 application version changed`,
  );
}

assert.match(readme,/firmware-beta-release\.yml\/badge\.svg\?branch=next%2Fv5-rearchitecture/);
console.log(
  'OK: autonomous CET/CEST behavior, UDP NTP, version and diagnostics contract',
);
