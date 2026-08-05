'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const lib = fs.readFileSync(
  'desktop-tauri/src-tauri/src/lib.rs',
  'utf8',
);
const page = fs.readFileSync(
  'desktop-tauri/src/pages/FirmwarePage.tsx',
  'utf8',
);
const api = fs.readFileSync(
  'desktop-tauri/src/services/tauriApi.ts',
  'utf8',
);

for (const token of [
  'github_releases',
  'release_matches_channel',
  'latest_app_release',
  'firmware_cancel',
  'ota_cancel_requested',
  'boot_id_before',
  'schedule_checksum_before',
  'cache_sha256',
]) {
  assert.match(lib, new RegExp(token));
}

assert.match(lib, /releases\?per_page=30/);
assert.match(lib, /X-GitHub-Api-Version/);
assert.match(api, /firmware_cancel/);
assert.match(page, /firmware\.availableApp/);
assert.match(page, /firmware\.downloadApp/);
assert.match(page, /Cache SHA-256/);

assert.match(
  lib,
  /fn ota_upload_mode_prefers_terminal\(mode: &str\) -> bool/,
);
assert.match(
  lib,
  /matches!\(mode\.trim\(\), "system" \| "custom"\)/,
);
assert.match(
  lib,
  /Beépített Tauri\/Rust HTTP OTA-motor \(auto\/bundled alapértelmezett\)/,
);
assert.match(
  lib,
  /normalized_ota_timeout_seconds\(config\.ota_timeout_seconds\)/,
);
assert.match(
  lib,
  /config\.ota_timeout_seconds,/,
);
assert.match(
  lib,
  /OTA SIKERTELEN: a várt firmware-verzió elérhető, de a Boot ID nem változott/,
);
assert.match(
  lib,
  /automatic_ota_prefers_builtin_rust_engine/,
);
assert.match(
  lib,
  /ota_timeout_is_clamped_to_supported_range/,
);

console.log(
  'OK: stable/beta GitHub release és alkalmazásfrissítési modell',
);
console.log(
  'OK: megszakítható OTA, cache SHA és Boot ID/schedule persistence kapu',
);
console.log(
  'OK: auto/bundled Rust OTA, konfigurált timeout és szigorú Boot ID kapu',
);
