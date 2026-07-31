'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8');

function main() {
  assert.strictEqual(read('VERSION').trim(), '5.0.0-beta.1');

  const checklist = read('docs/v5/V5_REARCHITECTURE_CHECKLIST.md');
  const status = read('docs/v5/V5_IMPLEMENTATION_STATUS.md');
  const known = read('docs/v5/BETA1_KNOWN_ISSUES.md');
  const execution = read('docs/v5/FIRMWARE_FIRST_EXECUTION_PLAN.md');
  const audit = read('docs/firmware/F14_0_FIRMWARE_AUDIT.md');
  const f141 = read('docs/firmware/F14_1_FIRMWARE_DIAGNOSTICS.md');
  const complete = read('docs/firmware/F14_COMPLETE_FIRMWARE_ADAPTATION.md');
  const gate = read('docs/firmware/F14_COMPLETE_HARDWARE_GATE.md');
  const firmware = read('firmware/ArduinoLedController/ArduinoLedController.ino');

  for (const marker of [
    'bd5cb67d3a40d1fa5d8e39f53615a7f50e5c1d3b',
    '295713798b1487ec2c788b170be2fce32fccea2a',
    '5.0.0-alpha.3'
  ]) {
    assert.ok(checklist.includes(marker) || status.includes(marker));
  }

  assert.match(audit, /Auditált firmware:[^\n]*`4\.1\.21`/);
  assert.match(f141, /4\.2\.0-beta\.1/);
  assert.match(complete, /4\.3\.0-beta\.1/);
  assert.match(complete, /Direct API/i);
  assert.match(complete, /1\.0\.0/);
  assert.match(gate, /hardver/i);
  assert.match(execution, /Tauri V15 belépési feltétel/);
  assert.match(firmware, /#define FIRMWARE_VERSION "4\.3\.0-beta\.1"/);
  assert.match(firmware, /#define DIRECT_API_VERSION "1\.0\.0"/);
  assert.match(firmware, /#define API_ALLOW_QUERY_KEY_FALLBACK 0/);
  assert.match(checklist, /Beolvasztás `main` ágba/);
  assert.match(status, /Tilos \/ korai/);
  assert.match(known, /F14/i);

  console.log('OK: alkalmazásverzió 5.0.0-beta.1');
  console.log('OK: Alpha.2/Alpha.3 történeti bizonyítékok megmaradtak');
  console.log('OK: F14.0 audit és F14.1 diagnosztikai történet megmaradt');
  console.log('OK: aktív firmware-dokumentáció 4.3.0-beta.1 / API 1.0.0');
  console.log('OK: teljes hardveres gate dokumentálva');
  console.log('OK: Tauri V15 csak firmware-gate után indul');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
