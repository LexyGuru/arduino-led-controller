#!/usr/bin/env node
'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const CURRENT_APP_VERSION = fs.readFileSync('VERSION', 'utf8').trim();
const CURRENT_FIRMWARE_VERSION = JSON.parse(fs.readFileSync('release-versions.json', 'utf8')).firmware;
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const versions = JSON.parse(read('release-versions.json'));
const applicationVersion = versions.application;
const firmwareVersion = versions.firmware;
const betaLabel = applicationVersion.replace(/^\d+\.\d+\.\d+-/, '');

assert.equal(applicationVersion, CURRENT_APP_VERSION);
assert.equal(firmwareVersion, CURRENT_FIRMWARE_VERSION);
assert.equal(versions.channel, 'beta');

const shellFiles = [
  'deploy/build-beta-release-bundle.sh',
  'deploy/install-beta-lxc.sh',
  'deploy/install-staging-service.sh',
  'deploy/verify-versioned-release.sh'
];

for (const relativePath of shellFiles) {
  const absolutePath = path.join(root, relativePath);
  childProcess.execFileSync('bash', ['-n', absolutePath], {
    stdio: 'pipe'
  });
  const mode = fs.statSync(absolutePath).mode & 0o777;
  assert.ok((mode & 0o111) !== 0, `${relativePath} nem végrehajtható.`);
}

const bundle = read('deploy/build-beta-release-bundle.sh');
assert.match(bundle, /5\\\.0\\\.0-beta/);
assert.match(bundle, /phase: 'staging'/);
assert.match(bundle, /productionDeploymentIncluded: false/);
assert.match(bundle, /secrets\\\.h|secrets\.h/);
assert.match(bundle, /RELEASE-METADATA\.json/);

const verifier = read('deploy/verify-versioned-release.sh');
assert.doesNotMatch(verifier, /\b(?:readarray|mapfile)\b/);
assert.match(verifier, /Bash 3\.2 kompatibilis/);
assert.match(verifier, /while IFS= read -r candidate/);
assert.match(verifier, /ROOT_COUNT=\$\(\(ROOT_COUNT \+ 1\)\)/);
assert.match(verifier, /command -v sha256sum/);
assert.match(verifier, /command -v shasum/);

const installer = read('deploy/install-beta-lxc.sh');
assert.match(
  installer,
  new RegExp(
    `VERSION="\\$\\{BETA_VERSION:-${escapeRegex(applicationVersion)}\\}"`
  )
);
assert.match(installer, /SHA256SUMS/);
assert.match(installer, /ALLOW_PRODUCTION_ARDUINO/);
assert.match(installer, /10\.0\.0\.123/);
assert.match(installer, /REQUIRE_RELEASE_EVIDENCE=0/);
assert.match(installer, /install-versioned-release\.sh/);
assert.match(installer, /rollback-versioned-release\.sh/);
assert.match(installer, /Node\.js 20/);

const stagingInstaller = read('deploy/install-staging-service.sh');
for (const expected of [
  'ARDUINO_TIMEOUT_MS 30000',
  'ARDUINO_HEALTH_TIMEOUT_MS 30000',
  'ARDUINO_STATUS_MONITOR_TIMEOUT_MS 30000',
  'RELEASE_CHANNEL beta',
  `RELEASE_CANDIDATE ${betaLabel}-gate`,
  `RELEASE_TARGET_VERSION ${applicationVersion}`
]) {
  assert.ok(
    stagingInstaller.includes(expected),
    `Hiányzó staging beállítás: ${expected}`
  );
}
assert.match(stagingInstaller, /10\.0\.0\.123/);
assert.match(stagingInstaller, /ALLOW_PRODUCTION_ARDUINO/);

const stagingEnv = read('deploy/staging.env.example');
for (const expected of [
  'PORT=3100',
  'BIND_HOST=127.0.0.1',
  'ARDUINO_IP=127.0.0.1',
  'ARDUINO_PORT=65535',
  'ARDUINO_TIMEOUT_MS=30000',
  'ARDUINO_HEALTH_TIMEOUT_MS=30000',
  'ARDUINO_STATUS_MONITOR_TIMEOUT_MS=30000',
  'RELEASE_CHANNEL=beta',
  `RELEASE_CANDIDATE=${betaLabel}-gate`,
  `RELEASE_TARGET_VERSION=${applicationVersion}`
]) {
  assert.ok(
    stagingEnv.includes(expected),
    `Hiányzó staging.env érték: ${expected}`
  );
}
assert.doesNotMatch(stagingEnv, /^ARDUINO_IP=10\.0\.0\.123$/m);

const betaEnv = read('deploy/beta-lxc.env.example');
assert.match(betaEnv, /ALLOW_PRODUCTION_ARDUINO=0/);
assert.match(betaEnv, /STAGING_ARDUINO_IP=127\.0\.0\.1/);
assert.doesNotMatch(betaEnv, /^STAGING_ARDUINO_IP=10\.0\.0\.123$/m);

const unit = read('deploy/systemd/arduino-led-controller-staging.service');
assert.match(
  unit,
  new RegExp(
    `Description=Arduino LED Controller ${escapeRegex(applicationVersion)} Staging`
  )
);
assert.match(unit, /NoNewPrivileges=true/);
assert.match(unit, /ProtectSystem=full/);
assert.match(unit, /PrivateTmp=true/);
assert.match(unit, /Restart=on-failure/);

const guide = read('docs/v5/BETA8_INSTALLATION_GUIDE.md');
for (const expected of [
  'Windows x86_64',
  'macOS Apple Silicon',
  'macOS Intel',
  'Linux x86_64',
  'Android',
  'iPhone és iPad',
  'Debian 12 / Proxmox LXC',
  'Arduino UNO R4 WiFi firmware',
  'SHA256SUMS',
  'SBOM.cdx.json',
  'PROVENANCE.json',
  'SECRET-SCAN.json'
]) {
  assert.ok(
    guide.includes(expected),
    `Hiányzó telepítési fejezet: ${expected}`
  );
}
assert.match(guide, /nincs notarizálva/);
assert.match(guide, /SmartScreen/);
assert.match(guide, /unsigned\.ipa.*nincs.*aláírva/is);

const notes = read('docs/v5/BETA8_RELEASE_NOTES.md');
assert.ok(
  notes.includes(applicationVersion),
  `A release notes nem tartalmazza: ${applicationVersion}`
);
assert.match(notes, /prerelease/);
assert.match(notes, /main.*nem módosul/is);
assert.match(notes, /produkciós.*10\.0\.0\.123/is);
assert.match(notes, /SBOM/);

const checklist = read('docs/v5/BETA8_RELEASE_CHECKLIST.md');
assert.match(checklist, /Windows x86_64/);
assert.match(checklist, /macOS Apple Silicon/);
assert.match(checklist, /macOS Intel/);
assert.match(checklist, /Linux x86_64/);
assert.match(checklist, /Android/);
assert.match(checklist, /iPhone és iPad/);
assert.match(checklist, /LXC \/ Debian szerver/);
assert.match(checklist, /Arduino UNO R4 WiFi firmware/);
assert.match(checklist, /Teljes alkalmazási staging/);

const self = fs.readFileSync(__filename, 'utf8');
assert.doesNotMatch(self, /5\.0\.0-beta\.3/);
assert.doesNotMatch(self, /Beta\.3 LXC/);

console.log(
  `OK: ${applicationVersion} LXC bundle, telepítő, systemd és rollback szerződés`
);
console.log('OK: macOS Bash 3.2-kompatibilis verziózott release-ellenőrző');
console.log('OK: 30 másodperces timeout és alapértelmezett hardverizoláció');
console.log('OK: minden kiadási platform telepítési és smoke-test dokumentációja');
