'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const MANIFEST =
  'docs/v5/PACKAGE_MANIFEST_F14_0_FIRMWARE_AUDIT.json';

function read(relative) {
  return fs.readFileSync(
    path.join(ROOT, relative),
    'utf8'
  );
}

function sha256(relative) {
  return crypto
    .createHash('sha256')
    .update(
      fs.readFileSync(
        path.join(ROOT, relative)
      )
    )
    .digest('hex');
}

function main() {
  const firmware = read(
    'firmware/ArduinoLedController/ArduinoLedController.ino'
  );
  const secrets = read(
    'firmware/ArduinoLedController/secrets.example.h'
  );

  assert.match(
    firmware,
    /#define FIRMWARE_VERSION "4\.1\.21"/
  );

  assert.match(
    firmware,
    /#define FIRMWARE_FEATURE "device-key-header-4\.1\.21"/
  );

  assert.match(
    firmware,
    /constexpr uint16_t HTTP_API_PORT = 80;/
  );

  assert.match(
    firmware,
    /constexpr uint16_t OTA_UPLOAD_PORT = 65280;/
  );

  assert.match(
    firmware,
    /constexpr uint8_t SCHEDULE_MAX = 60;/
  );

  assert.match(
    firmware,
    /constexpr uint16_t SCHEDULE_EEPROM_OFFSET = 256;/
  );

  assert.match(
    firmware,
    /constexpr uint16_t API_SETTINGS_EEPROM_OFFSET = 2300;/
  );

  assert.match(
    firmware,
    /EEPROM\.put\(SCHEDULE_EEPROM_OFFSET, header\);[\s\S]*EEPROM\.put\(SCHEDULE_EEPROM_OFFSET \+ sizeof\(ScheduleHeader\), schedules\);/
  );

  assert.doesNotMatch(
    firmware,
    /api\/v1/
  );

  assert.match(
    firmware,
    /Web API:[\s\S]*\/api\/status/
  );

  assert.match(
    firmware,
    /httpRejected\+\+; c\.stop\(\); continue;/
  );

  assert.match(
    firmware,
    /base == "\/api\/schedules\/upload"/
  );

  assert.match(
    firmware,
    /base == "\/api\/schedules\/chunk"/
  );

  assert.match(
    firmware,
    /base\.startsWith\("\/api\/led\/"\)/
  );

  assert.match(
    firmware,
    /const bool pollingRequest =/
  );

  assert.match(
    firmware,
    /if \(!pollingRequest && !timedOut\)/
  );

  assert.match(
    firmware,
    /queryKeyFallbackEnabled/
  );

  assert.match(
    secrets,
    /API_ALLOW_QUERY_KEY_FALLBACK 1/
  );

  const audit = read(
    'docs/firmware/F14_0_FIRMWARE_AUDIT.md'
  );
  const apiContract = read(
    'docs/firmware/ARDUINO_DIRECT_API_V1_CONTRACT.md'
  );
  const eeprom = read(
    'docs/firmware/ARDUINO_EEPROM_LAYOUT_4_1_21.md'
  );
  const serial = read(
    'docs/firmware/ARDUINO_SERIAL_COMMAND_CONTRACT.md'
  );
  const hardware = read(
    'docs/firmware/ARDUINO_HARDWARE_ACCEPTANCE_MATRIX.md'
  );
  const execution = read(
    'docs/v5/FIRMWARE_FIRST_EXECUTION_PLAN.md'
  );
  const checklist = read(
    'docs/v5/V5_REARCHITECTURE_CHECKLIST.md'
  );
  const status = read(
    'docs/v5/V5_IMPLEMENTATION_STATUS.md'
  );
  const knownIssues = read(
    'docs/v5/BETA1_KNOWN_ISSUES.md'
  );
  const openapi = JSON.parse(
    read('docs/api/arduino-direct-api-v1.json')
  );

  assert.match(
    audit,
    /F14-AUD-001/
  );

  assert.match(
    audit,
    /hibás konzol-URL/i
  );

  assert.match(
    audit,
    /néma útvonal- és metóduselutasítás/i
  );

  assert.match(
    audit,
    /schedule header kerül először EEPROM-ba/i
  );

  assert.match(
    audit,
    /chunk import közvetlenül az aktív RAM-ba ír/i
  );

  assert.match(
    apiContract,
    /X-Device-Key/
  );

  assert.match(
    apiContract,
    /\/api\/v1/
  );

  assert.match(
    apiContract,
    /PAYLOAD_TOO_LARGE/
  );

  assert.match(
    eeprom,
    /A\/B/
  );

  assert.match(
    eeprom,
    /8192/
  );

  assert.match(
    serial,
    /profile export secrets/
  );

  assert.match(
    serial,
    /profile-secret-begin/
  );

  assert.match(
    hardware,
    /1000 egymás utáni statuszkérés/
  );

  assert.match(
    hardware,
    /72 óra/
  );

  assert.match(
    execution,
    /Tauri V15 belépési feltétel/
  );

  assert.match(
    checklist,
    /F14\.4 hardveres stabilitási gate/
  );

  assert.match(
    checklist,
    /SZÜNETEL F14\.4-IG/
  );

  assert.match(
    status,
    /Firmware-first döntés/
  );

  assert.match(
    knownIssues,
    /Firmware-kapcsolati diagnosztika hiányos/
  );

  assert.strictEqual(
    openapi.openapi,
    '3.1.0'
  );

  assert.strictEqual(
    openapi.info.version,
    '1.0.0-draft'
  );

  assert.ok(
    openapi.components
      .securitySchemes
      .DeviceKey
  );

  assert.strictEqual(
    openapi.components
      .securitySchemes
      .DeviceKey
      .name,
    'X-Device-Key'
  );

  for (const endpoint of [
    '/api/v1/ping',
    '/api/v1/capabilities',
    '/api/v1/status',
    '/api/v1/diagnostics',
    '/api/v1/config/status',
    '/api/v1/leds',
    '/api/v1/leds/{ledId}',
    '/api/v1/leds/all',
    '/api/v1/schedules',
    '/api/v1/schedules/status',
    '/api/v1/logs',
    '/api/v1/logs/stats',
    '/api/v1/logs/clear',
    '/api/v1/ota/status',
    '/api/v1/ota/prepare'
  ]) {
    assert.ok(
      openapi.paths[endpoint],
      `Hiányzó OpenAPI endpoint: ${endpoint}`
    );
  }

  const manifest = JSON.parse(
    read(MANIFEST)
  );

  assert.strictEqual(
    manifest.package,
    'f14.0-firmware-audit-contract'
  );

  assert.strictEqual(
    manifest.expectedBaseCommit,
    'a70a84e335fe9c3199082269a2ce35502f15a6cc'
  );

  assert.strictEqual(
    manifest.auditedFirmwareVersion,
    '4.1.21'
  );

  assert.strictEqual(
    manifest.targetFirmwareVersion,
    '4.2.0-beta.1'
  );

  assert.strictEqual(
    manifest.firmwareSourceModified,
    false
  );

  assert.strictEqual(
    manifest.tauriFeatureDevelopmentPaused,
    true
  );

  assert.strictEqual(
    manifest.files.length,
    manifest.fileCountExcludingManifest
  );

  for (const entry of manifest.files) {
    const absolute =
      path.join(ROOT, entry.path);

    assert.ok(
      fs.existsSync(absolute),
      `Hiányzó manifestfájl: ${entry.path}`
    );

    assert.strictEqual(
      fs.statSync(absolute).size,
      entry.bytes,
      `${entry.path}: hibás fájlméret`
    );

    assert.strictEqual(
      sha256(entry.path),
      entry.sha256,
      `${entry.path}: hibás SHA-256`
    );
  }

  console.log(
    'OK: 4.1.21 firmware jelenlegi kockázatai auditálva'
  );
  console.log(
    'OK: Arduino Direct API v1 OpenAPI 3.1 szerződés'
  );
  console.log(
    'OK: EEPROM A/B és migrációs terv'
  );
  console.log(
    'OK: USB Serial parancs- és secret profile szerződés'
  );
  console.log(
    'OK: hardveres acceptance matrix'
  );
  console.log(
    'OK: Tauri fejlesztés F14.4 kapuig szünetel'
  );
  console.log(
    'OK: F14.0 manifest és SHA-256'
  );
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
}
