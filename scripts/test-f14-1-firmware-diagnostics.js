'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');
const readJson = (relative) => JSON.parse(read(relative));

function main() {
  const firmware = read('firmware/ArduinoLedController/ArduinoLedController.ino');
  const secrets = read('firmware/ArduinoLedController/secrets.example.h');
  const historical = readJson(
    'docs/v5/PACKAGE_MANIFEST_F14_1_FIRMWARE_DIAGNOSTICS.json'
  );
  const complete = readJson(
    'docs/v5/PACKAGE_MANIFEST_F14_COMPLETE_FIRMWARE.json'
  );

  // Az F14.1 manifest történeti bizonyíték, nem az aktív firmware verziója.
  assert.strictEqual(historical.package, 'f14.1-firmware-diagnostics');
  assert.strictEqual(historical.previousFirmwareVersion, '4.1.21');
  assert.strictEqual(historical.firmwareVersion, '4.2.0-beta.1');
  assert.strictEqual(historical.directApiDiagnosticsImplemented, true);
  assert.strictEqual(historical.serialSecretProfileExportImplemented, true);
  assert.strictEqual(historical.eepromAbSlotsImplemented, false);
  assert.strictEqual(historical.queryKeyFallbackDisabled, false);

  // Az aktív firmware az F14 Complete eredménye.
  assert.match(firmware, /#define FIRMWARE_VERSION "4\.3\.0-beta\.1"/);
  assert.match(
    firmware,
    /#define FIRMWARE_FEATURE "f14-complete-direct-api-storage"/
  );
  assert.match(firmware, /#define DIRECT_API_VERSION "1\.0\.0"/);
  assert.match(firmware, /#define API_DEVICE_KEY_HEADER "X-Device-Key"/);
  assert.match(firmware, /#define API_ALLOW_QUERY_KEY_FALLBACK 0/);
  assert.match(secrets, /API_ALLOW_QUERY_KEY_FALLBACK 0/);

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
    'SERIAL_COMMAND_SIZE = 160',
    'StoredSchedule EEPROM layout changed',
    'Kétmenetes ellenőrzés'
  ]) {
    assert.ok(firmware.includes(marker), `Hiányzó örökölt F14.1 marker: ${marker}`);
  }

  assert.match(firmware, /HTTP_BODY_BUFFER_SIZE = 2048/);
  assert.match(firmware, /HTTP_WRITE_CHUNK_SIZE = 128/);
  assert.doesNotMatch(firmware, /StoredSchedule staging\[SCHEDULE_MAX\]/);
  assert.match(firmware, /char message\[128\]/);

  assert.strictEqual(complete.firmwareVersion, '4.3.0-beta.1');
  assert.strictEqual(complete.directApiVersion, '1.0.0');
  assert.strictEqual(complete.queryFallbackDisabled, true);
  assert.strictEqual(complete.jsonBodyApiImplemented, true);
  assert.strictEqual(complete.configAbSlotsImplemented, true);
  assert.strictEqual(complete.scheduleAbSlotsImplemented, true);

  console.log('OK: F14.1 történeti manifest 4.2.0-beta.1 állapota megmaradt');
  console.log('OK: aktív firmware F14 Complete 4.3.0-beta.1');
  console.log('OK: F14.1 request ID, diagnosztika és Serial export regresszió');
  console.log('OK: F14.1.1 SRAM- és stackjavítás megmaradt');
  console.log('OK: query fallback az aktív firmware-ben kikapcsolva');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
