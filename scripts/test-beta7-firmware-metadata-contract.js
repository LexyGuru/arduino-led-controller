"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const versions = JSON.parse(fs.readFileSync("release-versions.json", "utf8"));
const release = JSON.parse(fs.readFileSync("firmware/firmware-release.json", "utf8"));

assert.match(versions.application, /^\d+\.\d+\.\d+-beta\.\d+$/);
assert.match(versions.firmware, /^\d+\.\d+\.\d+-beta\.\d+$/);
assert.equal(versions.directApi, "1.0.0");
assert.equal(release.firmwareVersion, versions.firmware);
assert.equal(release.directApiVersion, versions.directApi);
assert.equal(release.binary, `Arduino_LED_Controller_Firmware_${versions.firmware}_UNO_R4_WiFi.bin`);
assert.equal(release.checksum, `${release.binary}.sha256`);

console.log(`OK: current Beta application ${versions.application} + firmware ${versions.firmware} metadata és artifact fájlnevek egységesek`);
