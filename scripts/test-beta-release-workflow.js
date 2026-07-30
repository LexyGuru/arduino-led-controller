#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const workflowPath = path.join(
  root,
  '.github/workflows/beta-release.yml'
);
const source = fs.readFileSync(workflowPath, 'utf8');

function contains(pattern, message) {
  assert.match(source, pattern, message);
}

function excludes(pattern, message) {
  assert.doesNotMatch(source, pattern, message);
}

contains(/^name: V5 Beta release$/m, 'Hiányzó Beta workflow név.');
contains(/^on:\n  workflow_dispatch:/m, 'Hiányzik a későbbi kézi újrafuttatás szerződése.');
contains(/^  push:\n    branches:\n      - next\/v5-rearchitecture\n    paths:\n      - \.github\/workflows\/beta-release\.yml\n      - docs\/v5\/PACKAGE_MANIFEST_BETA1_DISTRIBUTION\.json$/m, 'A kezdeti Beta kiadás push gate-je nem elég szűk.');
excludes(/branches:\n(?:[ \t]+-[^\n]+\n)*[ \t]+- main/m, 'A Beta workflow nem futhat main pushra.');
excludes(/branches:\n(?:[ \t]+-[^\n]+\n)*[ \t]+- ["']?feature\//m, 'A Beta workflow nem futhat feature pushra.');
excludes(/^  schedule:/m, 'A Beta release nem lehet időzített.');
contains(/EXPECTED_BRANCH: next\/v5-rearchitecture/, 'Hibás Beta forráság.');
contains(/EXPECTED_VERSION: 5\.0\.0-beta\.1/, 'Hibás Beta verzió.');
contains(/EXPECTED_FIRMWARE_VERSION: 4\.1\.21/, 'Hibás firmware-verzió.');
contains(/contents: read/, 'Hiányzik az alapértelmezett read-only jogosultság.');
contains(/name: Publish GitHub prerelease[\s\S]*?permissions:\n      contents: write/, 'A write jogosultság nem csak a release jobhoz tartozik.');

for (const expected of [
  'Linux x86_64',
  'Windows x86_64',
  'macOS Apple Silicon',
  'macOS Intel',
  'Android APK and AAB',
  'Unsigned iOS and iPadOS IPA',
  'UNO R4 WiFi firmware',
  'Debian and Proxmox LXC server bundle'
]) {
  assert.ok(source.includes(expected), `Hiányzó buildcél: ${expected}`);
}

for (const assetPattern of [
  /\.AppImage/,
  /Linux_x86_64\.deb/,
  /Windows_x86_64_Setup\.exe/,
  /macOS_Apple_Silicon\.dmg/,
  /macOS_Intel\.dmg/,
  /Android(?:_debug)?\.apk/,
  /Android(?:_unsigned)?\.aab/,
  /iOS_iPadOS_unsigned\.ipa/,
  /Firmware_\$\{FW_VERSION\}_UNO_R4_WiFi\.bin/,
  /artifacts\/\*\.tar\.gz/
]) {
  contains(assetPattern, `Hiányzó release asset szerződés: ${assetPattern}`);
}

contains(/if: \$\{\{ github\.event_name == 'push' \|\| inputs\.publish \}\}/, 'A publish job nem támogatja a szűk kezdeti push gate-et.');
contains(/prerelease: true/, 'A GitHub kiadásnak prerelease-nek kell lennie.');
contains(/make_latest: false/, 'A Beta release nem lehet Latest.');
contains(/overwrite_files: true/, 'A workflow nem idempotens asset-feltöltésre.');
contains(/tag_name: \$\{\{ needs\.validate\.outputs\.tag \}\}/, 'Hiányzó verziózott Beta tag.');
contains(/SHA256SUMS/, 'Hiányzik a közös SHA-256 lista.');
contains(/RELEASE-MANIFEST\.json/, 'Hiányzik a gépi release manifest.');
contains(/SBOM\.cdx\.json/, 'Hiányzik az SBOM.');
contains(/PROVENANCE\.json/, 'Hiányzik a build provenance.');
contains(/SECRET-SCAN\.json/, 'Hiányzik a titokvizsgálati jelentés.');
contains(/BETA1_INSTALLATION_GUIDE\.md/, 'Hiányzik a telepítési útmutató.');
contains(/BETA1_RELEASE_CHECKLIST\.md/, 'Hiányzik a release checklist.');
contains(/install-beta-lxc\.sh/, 'Hiányzik az LXC telepítő.');
contains(/test-beta-release-manifest\.js/, 'Hiányzik a Beta manifest gate.');
contains(/test-beta-installation-assets\.js/, 'Hiányzik a telepítési asset gate.');
contains(/test-beta-release-workflow\.js/, 'Hiányzik a workflow saját szerződéses tesztje.');
contains(/assetCount:\(\.assets\|length\)/, 'Hiányzik a feltöltött assetek ellenőrzése.');
contains(/-ge 20/, 'A minimum release asset szám túl alacsony.');

excludes(/firmware-latest/, 'A Beta release nem frissítheti a firmware-latest kiadást.');
excludes(/10\.0\.0\.123/, 'A release workflow nem tartalmazhat produkciós Arduino-célt.');
excludes(/target_commitish:\s*main/, 'A release nem célozhatja közvetlenül a main ágat.');
excludes(/make_latest:\s*true/, 'A Beta release nem lehet Latest.');

console.log('OK: szűk next-push gate és későbbi workflow_dispatch Beta publikálás');
console.log('OK: Windows, két macOS architektúra, Linux, Android, iOS, LXC és firmware buildcél');
console.log('OK: SHA-256, manifest, SBOM, provenance és titokvizsgálati release evidence');
