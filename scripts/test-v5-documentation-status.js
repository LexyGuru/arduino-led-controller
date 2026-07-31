'use strict';

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CURRENT_VERSION = '5.0.0-beta.1';
const BETA_COMMIT = 'ef42c233ebd99a42ec68a5b422b9787b0c4cda44';
const BETA_RUN = '30564106374';
const ALPHA3_MERGE = '295713798b1487ec2c788b170be2fce32fccea2a';
const MANIFEST_PATH =
  'docs/v5/PACKAGE_MANIFEST_V5_DIRECT_ARDUINO_DOCUMENTATION.json';

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function sha256(relativePath) {
  return crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(ROOT, relativePath)))
    .digest('hex');
}

function assertIncludes(content, value, label) {
  assert.ok(content.includes(value), `${label}: hiányzó szöveg: ${value}`);
}

function main() {
  assert.strictEqual(read('VERSION').trim(), CURRENT_VERSION);

  const readme = read('README.md');
  const roadmap = read('fejlesztes_readme.md');
  const checklist = read('docs/v5/V5_REARCHITECTURE_CHECKLIST.md');
  const status = read('docs/v5/V5_IMPLEMENTATION_STATUS.md');
  const architecture = read('docs/v5/V5_DIRECT_ARDUINO_ARCHITECTURE.md');
  const security = read('docs/v5/V5_DIRECT_ARDUINO_SECURITY.md');
  const platforms = read('docs/v5/V5_DESKTOP_MOBILE_ROADMAP.md');
  const knownIssues = read('docs/v5/BETA1_KNOWN_ISSUES.md');
  const index = read('docs/v5/README.md');
  const firmwareExecution =
    read('docs/v5/FIRMWARE_FIRST_EXECUTION_PLAN.md');
  const firmwareAudit =
    read('docs/firmware/F14_0_FIRMWARE_AUDIT.md');
  const directApiContract =
    read('docs/firmware/ARDUINO_DIRECT_API_V1_CONTRACT.md');
  const serialContract =
    read('docs/firmware/ARDUINO_SERIAL_COMMAND_CONTRACT.md');
  const firmwareOpenApi =
    JSON.parse(read('docs/api/arduino-direct-api-v1.json'));

  for (const [label, content] of [
    ['README', readme],
    ['roadmap', roadmap],
    ['checklist', checklist],
    ['status', status]
  ]) {
    assertIncludes(content, CURRENT_VERSION, label);
    assertIncludes(content, BETA_COMMIT, label);
  }

  assertIncludes(readme, BETA_RUN, 'README');
  assertIncludes(roadmap, BETA_RUN, 'roadmap');
  assertIncludes(checklist, BETA_RUN, 'checklist');

  for (const [label, content] of [
    ['roadmap', roadmap],
    ['checklist', checklist],
    ['status', status]
  ]) {
    assertIncludes(content, ALPHA3_MERGE, label);
  }

  for (const [label, content] of [
    ['README', readme],
    ['architecture', architecture],
    ['roadmap', roadmap]
  ]) {
    assert.match(content, /közvetlen Arduino/i, `${label}: direct-first hiányzik`);
    assert.match(content, /opcionális/i, `${label}: opcionális mód hiányzik`);
  }

  assert.match(readme, /Node\.js.*LXC/is);
  assert.match(roadmap, /Node\.js\/LXC/i);
  assert.match(architecture, /opcionális szerver/i);

  assert.match(readme, /EEPROM.*időzítés/is);
  assert.match(architecture, /Arduino.*hiteles/is);
  assert.match(architecture, /X-Device-Key/);
  assert.match(security, /controller-profile\.secret\.json/);
  assert.match(security, /nem olvashatja ki/i);
  assert.match(platforms, /mobileSupportsOta = false/);
  assert.match(knownIssues, /Bearer token nincs létrehozva/i);
  assert.match(knownIssues, /V5 rendszer/i);
  assert.match(knownIssues, /összekever/i);
  assert.match(index, /Tauri \/ mobil -> közvetlen Arduino/);
  assert.match(index, /Firmware-first dokumentáció/);
  assert.match(firmwareExecution, /Tauri V15 belépési feltétel/);
  assert.match(firmwareAudit, /F14-AUD-001/);
  assert.match(directApiContract, /\/api\/v1/);
  assert.match(serialContract, /profile export secrets/);
  assert.strictEqual(firmwareOpenApi.openapi, '3.1.0');
  assert.ok(firmwareOpenApi.paths['/api/v1/status']);

  for (const content of [
    readme,
    roadmap,
    checklist,
    status,
    architecture,
    security,
    platforms,
    knownIssues
  ]) {
    assert.ok(
      !/Node\/LXC szerver kötelező/i.test(content),
      'A dokumentáció nem állíthat kötelező LXC-függést'
    );
    assert.ok(
      !/session-cookie a közvetlen Arduino hitelesítése/i.test(content),
      'Session-cookie nem lehet direct Arduino auth'
    );
  }

  const manifest = JSON.parse(read(MANIFEST_PATH));
  assert.strictEqual(manifest.package, 'v5-direct-arduino-v14.0-documentation');
  assert.strictEqual(manifest.applicationVersion, CURRENT_VERSION);
  assert.strictEqual(manifest.architecture, 'direct-arduino-first');
  assert.strictEqual(manifest.nodeLxcRequired, false);
  assert.strictEqual(manifest.mobileOtaSupported, false);
  assert.strictEqual(manifest.files.length, manifest.fileCountExcludingManifest);

  const evolvedAfterV14 = new Set([
    'docs/v5/BETA1_KNOWN_ISSUES.md',
    'docs/v5/README.md',
    'docs/v5/V5_IMPLEMENTATION_STATUS.md',
    'docs/v5/V5_REARCHITECTURE_CHECKLIST.md',
    'scripts/test-v5-documentation-status.js'
  ]);

  let unchangedHashChecks = 0;
  let evolvedChecks = 0;

  for (const entry of manifest.files) {
    const absolute = path.join(ROOT, entry.path);
    assert.ok(fs.existsSync(absolute), `Hiányzó manifestfájl: ${entry.path}`);

    if (evolvedAfterV14.has(entry.path)) {
      evolvedChecks += 1;
      continue;
    }

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
    unchangedHashChecks += 1;
  }

  assert.ok(unchangedHashChecks > 0);
  assert.strictEqual(evolvedChecks, evolvedAfterV14.size);
  assert.match(checklist, /V14\.1/);
  assert.match(knownIssues, /V14\.1 forrásjavítás/);
  assert.match(knownIssues, /Firmware-kapcsolati diagnosztika hiányos/);
  assert.match(checklist, /F14\.0 teljes `4\.1\.21` firmware-audit/);
  assert.match(status, /Firmware-first döntés/);

  console.log('OK: V5 közvetlen Arduino-első dokumentáció');
  console.log('OK: Node/LXC nem kötelező');
  console.log('OK: Arduino EEPROM a schedule elsődleges tárolója');
  console.log('OK: X-Device-Key a közvetlen hitelesítés');
  console.log('OK: mobil OTA tiltott');
  console.log('OK: V14.0 történeti manifest és változatlan SHA-256 fájlok');
  console.log('OK: V14.1-ben fejlődő aktív dokumentumok engedélyezve');
  console.log('OK: F14.0 firmware-first dokumentáció és OpenAPI');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
