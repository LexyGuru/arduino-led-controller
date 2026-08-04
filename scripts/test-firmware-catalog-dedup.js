#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const read = (file) => fs.readFileSync(file, 'utf8');
const page = fs.readFileSync('desktop-tauri/src/pages/FirmwarePage.tsx','utf8');
const i18n = fs.readFileSync('desktop-tauri/src/i18n/index.tsx','utf8');
const types = fs.readFileSync('desktop-tauri/src/types/index.ts','utf8');
assert.match(page, /function deduplicateFirmwareCatalog/);
assert.match(page, /const firmwareCatalog = deduplicateFirmwareCatalog\(releaseCatalog\)/);
assert.match(page, /firmware\.versionTitle/);
assert.match(page, /firmware\.relatedReleases/);
assert.match(page, /compareVersions\(version, firmware\.installedVersion\)/);
assert.doesNotMatch(page, /releaseCatalog\.map\(\(item\)/);
assert.match(types, /relatedTags\?: string\[\]/);
for (const key of ['firmware.versionTitle','firmware.badgeInstalled','firmware.badgeLatest','firmware.badgePrevious','firmware.relatedReleases','firmware.fileLabel']) {
  assert.equal((i18n.match(new RegExp(`"${key.replace('.', '\\.') }"`, 'g')) || []).length, 3, `${key} nem szerepel mindhárom nyelven`);
}
console.log('OK: firmware-katalógus deduplikáció, egyértelmű címek és szemantikus verziókezelés');

assert.match(page, /item\.metadataConflict/);
assert.match(page, /metadataVersionLabel/);
assert.match(page, /disabled=\{state\.busy \|\| Boolean\(item\.metadataConflict\)\}/);
const rust = read('desktop-tauri/src-tauri/src/lib.rs');
assert.match(rust, /fn firmware_version_from_asset/);
assert.match(rust, /fn firmware_version_from_release_body/);
assert.match(rust, /Firmware metadata-konfliktus/);
assert.match(rust, /artifact\.metadata_conflict\.is_none\(\)/);
console.log('OK: firmware asset és release metadata eltérés blokkolása');
