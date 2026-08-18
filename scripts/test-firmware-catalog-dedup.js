#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const read = (file) => fs.readFileSync(file, 'utf8');
const page = fs.readFileSync('desktop-tauri/src/pages/FirmwarePage.tsx','utf8');
const i18n = fs.readFileSync('desktop-tauri/src/i18n/runtime.ts','utf8');
const types = fs.readFileSync('desktop-tauri/src/types/index.ts','utf8');
const rust = read('desktop-tauri/src-tauri/src/lib.rs');
assert.match(page, /function deduplicateFirmwareCatalog/);
assert.match(page, /const firmwareCatalog = deduplicateFirmwareCatalog\(releaseCatalog\)/);
assert.match(page, /firmware\.versionTitle/);

// OTA 2.0 contract: catalog installs are routed through the live install controller.
// Do not require the removed legacy direct call firmwareInstallRelease(version).
assert.match(
  page,
  /const controller = createOta2LiveInstallController\(\{[\s\S]*?firmwareInstallRelease:\s*tauriApi\.firmwareInstallRelease,[\s\S]*?firmwareStatus:\s*tauriApi\.firmwareStatus,[\s\S]*?subscribeProgress:\s*tauriApi\.listenOtaProgress,[\s\S]*?createBackup:\s*\(\) => recovery\.prepare\(\)[\s\S]*?\}\);/
);
assert.match(
  page,
  /const value = await controller\.install\(\{[\s\S]*?firmware,[\s\S]*?artifact:\s*item,[\s\S]*?version,[\s\S]*?onRuntime:\s*setOta2Runtime[\s\S]*?\}\);/
);
assert.match(
  page,
  /await installCatalogItem\(\s*item,\s*version,\s*installed[\s\S]*?\?\s*'reinstall'[\s\S]*?:\s*rollback[\s\S]*?\?\s*'restore'[\s\S]*?:\s*'update'[\s\S]*?\);/
);

assert.match(page, /compareVersions\(version, firmware\.installedVersion\)/);
assert.doesNotMatch(page, /releaseCatalog\.map\(\(item\)/);
assert.match(types, /relatedTags\?: string\[\]/);
for (const key of ['firmware.versionTitle','firmware.badgeInstalled','firmware.badgeLatest','firmware.badgePrevious','firmware.fileLabel']) {
  assert.equal((i18n.match(new RegExp(`"${key.replace('.', '\\.') }"`, 'g')) || []).length, 3, `${key} nem szerepel mindhárom nyelven`);
}
console.log('OK: firmware-katalógus deduplikáció, OTA 2.0 install wiring, egyértelmű címek és szemantikus verziókezelés');

assert.match(rust, /FIRMWARE_BETA_RELEASE_TAG/);
assert.match(rust, /firmware_artifacts_from_release/);
assert.match(rust, /firmware_beta_release/);
assert.doesNotMatch(rust, /firmware_version_from_release_body/);
console.log('OK: dedikált firmware release és többverziós rollback katalógus');
