#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (path) => fs.readFileSync(path, 'utf8');

const rust = read('desktop-tauri/src-tauri/src/lib.rs');
const bridge = read(
  'desktop-tauri/src-tauri/src/credential_bridge.rs'
);
const types = read('desktop-tauri/src/types/index.ts');
const settings = read(
  'desktop-tauri/src/pages/SettingsPage.tsx'
);
const firmwarePage = read(
  'desktop-tauri/src/pages/FirmwarePage.tsx'
);
const i18n = read('scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt');

for (const token of [
  'firmware_update_channel',
  'FIRMWARE_BETA_RELEASE_TAG',
  'nincs beta fallback'
]) {
  assert.ok(rust.includes(token), token);
}

assert.match(
  rust,
  /firmware_update_channel\.trim\(\) != "beta"/
);
assert.match(
  rust,
  /stabil dedikált firmware-release.*nincs beta fallback/i
);
assert.match(
  rust,
  /return Err\(.*nincs beta fallback/s
);

for (const token of [
  'SESSION_CACHE',
  'OnceLock',
  'cached(&account)',
  'cache(&account'
]) {
  assert.ok(bridge.includes(token), token);
}

assert.ok(types.includes('firmwareUpdateChannel'));
assert.ok(
  settings.includes('settings.updates.firmwareChannel')
);

for (const token of [
  "'settings.updates.firmwareChannel': 'Firmware-frissítési csatorna'",
  "'settings.updates.firmwareChannel': 'Firmware update channel'",
  "'settings.updates.firmwareChannel': 'Firmware-Update-Kanal'"
]) {
  assert.ok(i18n.includes(token), token);
}

assert.ok(firmwarePage.includes('firmwareUpdateChannel'));

console.log(
  'OK: külön alkalmazás/firmware csatorna és strict firmware gate'
);
console.log(
  'OK: stable csatornáról nincs automatikus Beta firmware fallback'
);
console.log(
  'OK: macOS Keychain munkamenet-cache megszünteti a többszörös feloldást'
);

for (const token of [
  'ota_configured',
  'ota_missing_requirements',
  'backup_store_configured',
  'version_token_from_text'
]) {
  assert.ok(rust.includes(token), token);
}

// A teljes firmware SHA-256 ellenőrzési folyamat.
for (const token of [
  'checksum_url',
  'Üres checksum fájl',
  'Sha256::digest(&firmware)',
  'expected.len() != 64',
  'expected != actual',
  'persisted_hash != actual',
  'cache_sha256'
]) {
  assert.ok(rust.includes(token), token);
}

assert.match(
  rust,
  /let checksum_text = download_client\s*\.get\(&artifact\.checksum_url\)/s
);
assert.match(
  rust,
  /let expected = checksum_text\s*\.split_whitespace\(\)\s*\.next\(\)/s
);
assert.match(
  rust,
  /let actual = hex::encode\(Sha256::digest\(&firmware\)\);/
);
assert.match(
  rust,
  /if expected\.len\(\) != 64 \|\| expected != actual/
);
assert.match(
  rust,
  /let persisted_hash = hex::encode\(Sha256::digest\(&persisted_firmware\)\);/
);
assert.match(
  rust,
  /persisted_hash != actual/
);

for (const token of [
  'otaConfigured',
  'otaMissingRequirements',
  'backupStoreConfigured'
]) {
  assert.ok(types.includes(token), token);
}

assert.ok(
  firmwarePage.includes('firmware.missingRequirements')
);
assert.ok(
  firmwarePage.includes('otaMissingRequirements')
);

const activeVersions = JSON.parse(
  read('release-versions.json')
);

assert.ok(
  read('firmware/firmware-release.json').includes(
    `Arduino_LED_Controller_Firmware_${activeVersions.firmware}_UNO_R4_WiFi.bin`
  )
);

assert.ok(
  read('docs/v5/BETA4_RELEASE_NOTES.md').includes(
    'Firmware verzió: 4.3.0-beta.3'
  )
);

console.log(
  'OK: OTA konfiguráció, backup státusz és firmware artifact felismerés javítva'
);
console.log(
  'OK: BIN + .sha256 + helyi visszaolvasás teljes SHA-256 ellenőrzése'
);
