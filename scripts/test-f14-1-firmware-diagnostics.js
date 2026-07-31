'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MANIFEST = 'docs/v5/PACKAGE_MANIFEST_F14_1_FIRMWARE_DIAGNOSTICS.json';

function read(relative) {
  return fs.readFileSync(path.join(ROOT, relative), 'utf8');
}

function sha256(relative) {
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, relative)))
    .digest('hex');
}

function main() {
  const firmware = read('firmware/ArduinoLedController/ArduinoLedController.ino');
  const secrets = read('firmware/ArduinoLedController/secrets.example.h');

  assert.match(firmware, /#define FIRMWARE_VERSION "4\.2\.0-beta\.1"/);
  assert.match(firmware, /#define FIRMWARE_FEATURE "f14\.1\.3-wifis3-response-transport"/);
  assert.match(firmware, /#define DIRECT_API_VERSION "1\.0\.0-beta\.1"/);
  assert.match(firmware, /#define API_DEVICE_KEY_HEADER "X-Device-Key"/);

  for (const marker of [
    'X-Request-Id',
    'PRIVATE_PATH_NOT_FOUND',
    'METHOD_NOT_ALLOWED',
    'MISSING_DEVICE_KEY',
    'INVALID_DEVICE_KEY',
    'DUPLICATE_DEVICE_KEY_HEADER',
    'HEADER_TIMEOUT',
    'ENDPOINT_NOT_FOUND',
    '.remoteIP()',
    'AUTH=%s',
    'HTTP_POLLING_SUMMARY_INTERVAL',
    'HTTP_TRACE_MAX_TIME',
    'profile export secrets',
    '[profile-secret-begin]',
    '[profile-secret-end]',
    '/api/v1/ping',
    '/api/v1/capabilities',
    '/api/v1/status',
    '/api/v1/diagnostics',
    '/api/v1/config/status',
    '/api/v1/schedules/status',
    'LOG_CAPACITY = 32',
    'HTTP_BODY_BUFFER_SIZE = 2560',
    'SERIAL_COMMAND_SIZE = 160',
    'StoredSchedule EEPROM layout changed',
    'Kétmenetes ellenőrzés'
  ]) {
    assert.ok(firmware.includes(marker), `Hiányzó marker: ${marker}`);
  }

  assert.match(firmware, /http:\/\/%s:%u%s\/api\/status/);
  assert.match(firmware, /http:\/\/%s:%u%s\/api\/v1\/status/);
  assert.doesNotMatch(firmware, /httpRejected\+\+;\s*c\.stop\(\);\s*continue;/);

  assert.match(firmware, /API_ALLOW_QUERY_KEY_FALLBACK[\s\S]*1/);
  assert.match(secrets, /API_ALLOW_QUERY_KEY_FALLBACK 1/);
  assert.match(firmware, /F14\.2-ben megszunik/);
  assert.match(firmware, /abSlots\\":false/);
  assert.match(firmware, /readbackAfterWrite\\":false/);
  assert.match(firmware, /F14\.3 A\/B/);

  assert.doesNotMatch(
    firmware,
    /StoredSchedule staging\[SCHEDULE_MAX\]/
  );
  assert.match(firmware, /char message\[128\]/);

  const manifest = JSON.parse(read(MANIFEST));
  assert.strictEqual(manifest.package, 'f14.1-firmware-diagnostics');
  assert.strictEqual(
    manifest.expectedBaseCommit,
    'e31fa0e1f1123b6d2810c330c43fdb581e26b496'
  );
  assert.strictEqual(manifest.previousFirmwareVersion, '4.1.21');
  assert.strictEqual(manifest.firmwareVersion, '4.2.0-beta.1');
  assert.strictEqual(manifest.directApiDiagnosticsImplemented, true);
  assert.strictEqual(manifest.serialSecretProfileExportImplemented, true);
  assert.strictEqual(manifest.eepromAbSlotsImplemented, false);
  assert.strictEqual(manifest.queryKeyFallbackDisabled, false);
  assert.strictEqual(manifest.hardwareValidationCompleted, false);
  assert.strictEqual(manifest.files.length, manifest.fileCountExcludingManifest);

  for (const entry of manifest.files) {
    const absolute = path.join(ROOT, entry.path);
    assert.ok(fs.existsSync(absolute), `Hiányzó fájl: ${entry.path}`);
    assert.strictEqual(fs.statSync(absolute).size, entry.bytes);
    assert.strictEqual(sha256(entry.path), entry.sha256);
  }

  console.log('OK: firmware 4.2.0-beta.1 F14.1 verziószerződés');
  console.log('OK: request ID és egységes HTTP hibaválaszok');
  console.log('OK: kliens-IP, auth, státuszkód és latency audit');
  console.log('OK: polling summary és időkorlátos trace');
  console.log('OK: Serial parancsok és explicit secret profil-export');
  console.log('OK: read-only Arduino Direct API v1 diagnosztika');
  console.log('OK: F14.2/F14.3 korlátok nyitva maradtak');
  console.log('OK: F14.1.1 SRAM budget és stackcsúcs javítva');
  console.log('OK: F14.1 manifest és SHA-256');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
