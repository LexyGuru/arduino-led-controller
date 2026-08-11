"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const versions = JSON.parse(fs.readFileSync("release-versions.json", "utf8"));
const release = JSON.parse(fs.readFileSync("firmware/firmware-release.json", "utf8"));

assert.equal(versions.application, "5.0.0-beta.10");
assert.equal(versions.firmware, "5.0.0-beta.7");
assert.equal(versions.directApi, "1.0.0");
assert.equal(release.firmwareVersion, "5.0.0-beta.7");
assert.equal(release.directApiVersion, "1.0.0");
assert.equal(release.binary, "Arduino_LED_Controller_Firmware_5.0.0-beta.7_UNO_R4_WiFi.bin");
assert.equal(release.checksum, "Arduino_LED_Controller_Firmware_5.0.0-beta.7_UNO_R4_WiFi.bin.sha256");

console.log("OK: Beta.9 application + Beta.6 firmware metadata és artifact fájlnevek egységesek");
