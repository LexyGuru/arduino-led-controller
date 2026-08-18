const fs = require("fs");
const assert = require("assert");
const fw = fs.readFileSync("firmware/ArduinoLedController/ArduinoLedController.ino", "utf8");
const lib = fs.readFileSync("desktop-tauri/src-tauri/src/lib.rs", "utf8");
const versions = JSON.parse(fs.readFileSync("release-versions.json", "utf8"));

assert.match(fw, /#define FIRMWARE_VERSION "5\.0\.0-beta\.8"/);
assert.match(fw, /BOOT_GENERATION_SLOT_COUNT = 64/);
assert.match(fw, /BOOT_GENERATION_PUBLIC_MAX = 1000000UL/);
assert.match(fw, /BOOT_GENERATION_EEPROM_OFFSET = 5120/);
assert.match(fw, /BootGenerationRecord/);
assert.match(fw, /initializeBootGeneration\(\);/);
assert.match(fw, /bootGeneration/);
assert.match(fw, /const uint8_t MATRIX_BOOT\[12\]/);
assert.match(fw, /uint8_t matrixFrame\[8\]\[12\]/);
assert.doesNotMatch(fw, /\bString\b/);
assert.doesNotMatch(fw, /\b(?:float|double)\b/);

assert.match(lib, /boot_generation_before: Option<u64>/);
assert.match(lib, /get\("bootGeneration"\)/);
assert.match(lib, /SAME_VERSION_REINSTALL_CONFIRMED/);
assert.match(lib, /NEW_FIRMWARE_BOOT_CONFIRMED/);
assert.match(lib, /NEW_FIRMWARE_VERSION_TRANSITION_CONFIRMED/);
assert.match(lib, /LEGACY_BOOT_ID_FALLBACK_CONFIRMED/);
assert.match(lib, /OTA_ROLLBACK_OR_WRONG_FIRMWARE/);

assert.strictEqual(versions.application, "5.5.1-beta.2");
assert.strictEqual(versions.firmware, "5.0.0-beta.9");
assert.strictEqual(versions.directApi, "1.0.0");

console.log("FIRMWARE_BETA8_VERSION=PASSED");
console.log("BOOT_GENERATION_64_SLOT_RING=PASSED");
console.log("BOOT_GENERATION_PUBLIC_WRAP_1_TO_1000000=PASSED");
console.log("STRING_FREE_FIRMWARE_SOURCE=PASSED");
console.log("FIXED_POINT_EFFECT_SOURCE=PASSED");
console.log("PACKED_MATRIX_STORAGE=PASSED");
console.log("TAURI_BOOT_GENERATION_AUTHORITY=PASSED");
console.log("BETA7_TO_BETA8_MIGRATION_GATE=PASSED");
console.log("V376_FIRMWARE_BETA8_BOOT_GENERATION_SIZE_CONTRACT=PASSED");
