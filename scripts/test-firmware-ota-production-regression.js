"use strict";
const assert=require("node:assert/strict"),fs=require("node:fs");
const fw=fs.readFileSync("firmware/ArduinoLedController/ArduinoLedController.ino","utf8");
const versions=JSON.parse(fs.readFileSync("release-versions.json","utf8"));
const meta=JSON.parse(fs.readFileSync("firmware/firmware-release.json","utf8"));
const otaDoc=fs.readFileSync("docs/firmware/OTA_UPDATE.md","utf8");
assert.match(versions.firmware,/^\d+\.\d+\.\d+-beta\.\d+$/);
assert.equal(meta.firmwareVersion,versions.firmware);
assert.ok(fw.includes(`#define FIRMWARE_VERSION "${versions.firmware}"`));
assert.ok(fw.includes('#define OTA_MAINTENANCE_MODE_V1 1'));
const loop=fw.slice(fw.indexOf("void loop() {"));
assert.ok(loop.indexOf("updateOtaVisualState()") < loop.indexOf("if (otaExclusiveMode || otaTransferActive) return;"));
for (const name of ["enterOtaExclusiveMode","otaTransferStarted","otaBeforeApply","prepareOtaService"]) {
  const start=fw.indexOf(`void ${name}`)>=0?fw.indexOf(`void ${name}`):fw.indexOf(`bool ${name}`);
  assert.ok(start>=0,`Hiányzó OTA függvény: ${name}`);
  const next=fw.indexOf("\n}",start);
  const section=fw.slice(start,next+2);
  assert.doesNotMatch(section,/clearAllSchedules|clearSchedules|saveSchedules|writeSchedule|EEPROM\.write|EEPROM\.put/,
    `${name} nem módosíthat schedule storage-ot`);
}
assert.match(otaDoc,/nem törli, nem exportálja és nem írja újra/i);
assert.match(otaDoc,/prepare timeout/i);
console.log("OK: Beta.6 OTA production regression contract");
console.log("OK: prepare timeout recovery + non-destructive schedule persistence contract");
