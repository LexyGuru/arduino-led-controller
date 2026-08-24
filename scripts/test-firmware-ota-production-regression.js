"use strict";

const assert=require("node:assert/strict");
const fs=require("node:fs");

const fw=fs.readFileSync("firmware/ArduinoLedController/ArduinoLedController.ino","utf8");
const versions=JSON.parse(fs.readFileSync("release-versions.json","utf8"));
const __v774AppBeta = /-beta\.\d+$/.test(versions.application);
const __v774FirmwareBeta = /-beta\.\d+$/.test(versions.firmware);
const meta=JSON.parse(fs.readFileSync("firmware/firmware-release.json","utf8"));
const __v774FirmwareMetaBeta = /-beta\.\d+$/.test(meta.firmwareVersion);
const otaDoc=fs.readFileSync("docs/firmware/OTA_UPDATE.md","utf8");

assert.ok(
  versions.channel==="beta" || versions.channel==="stable",
  `Unsupported application release channel: ${versions.channel}`
);

const firmwareChannel=versions.firmwareRelease?.channel;
assert.ok(
  firmwareChannel==="beta" || firmwareChannel==="stable",
  `Unsupported firmware release channel: ${firmwareChannel}`
);

if (firmwareChannel==="beta") {
  assert.match(versions.firmware, __v774FirmwareBeta ? /^\d+\.\d+\.\d+-beta\.\d+$/ : /^\d+\.\d+\.\d+$/);
  assert.equal(meta.channel, __v774FirmwareMetaBeta ? 'beta' : 'stable');
} else {
  assert.match(versions.firmware,/^\d+\.\d+\.\d+$/);
  assert.equal(meta.channel,"stable");
}

assert.equal(meta.channel,firmwareChannel);
assert.equal(meta.firmwareVersion,versions.firmware);
assert.equal(versions.firmwareRelease.recommendedVersion,versions.firmware);
assert.ok(fw.includes(`#define FIRMWARE_VERSION "${versions.firmware}"`));
assert.ok(fw.includes('#define OTA_MAINTENANCE_MODE_V1 1'));

const loop=fw.slice(fw.indexOf("void loop() {"));
assert.ok(
  loop.indexOf("updateOtaVisualState()") <
  loop.indexOf("if (otaExclusiveMode || otaTransferActive) return;")
);

for (const name of ["enterOtaExclusiveMode","otaTransferStarted","otaBeforeApply","prepareOtaService"]) {
  const start=fw.indexOf(`void ${name}`)>=0
    ? fw.indexOf(`void ${name}`)
    : fw.indexOf(`bool ${name}`);
  assert.ok(start>=0,`Hiányzó OTA függvény: ${name}`);
  const next=fw.indexOf("\n}",start);
  const section=fw.slice(start,next+2);
  assert.doesNotMatch(
    section,
    /clearAllSchedules|clearSchedules|saveSchedules|writeSchedule|EEPROM\.write|EEPROM\.put/,
    `${name} nem módosíthat schedule storage-ot`
  );
}

assert.match(otaDoc,/nem törli, nem exportálja és nem írja újra/i);
assert.match(otaDoc,/prepare timeout/i);

console.log(`OK: OTA production regression contract — firmware ${versions.firmware} ${firmwareChannel}`);
console.log(`OK: application channel ${versions.channel} is independent from firmware channel ${firmwareChannel}`);
console.log("OK: prepare timeout recovery + non-destructive schedule persistence contract");
