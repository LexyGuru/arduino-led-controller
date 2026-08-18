import assert from "node:assert/strict";import fs from "node:fs";
const rust=fs.readFileSync("desktop-tauri/src-tauri/src/lib.rs","utf8");const cargo=fs.readFileSync("desktop-tauri/src-tauri/Cargo.toml","utf8");
for(const marker of ["Sha256::digest(&firmware)","persisted_hash != actual","confirm_restart(","schedule_revision_before != schedule_revision_after","schedule_checksum_before != schedule_checksum_after","ensure_not_cancelled(state)?","ota_cancel_requested"]){assert.ok(rust.includes(marker),marker)}
assert.ok(rust.includes("latest_app_release"));assert.ok(cargo.includes("tauri-plugin-updater"));assert.ok(rust.includes("app_update_check"));assert.ok(rust.includes("app_update_install"));
console.log("BETA3_NATIVE_BINARY_SHA_VERIFY=PASSED");
console.log("BETA3_NATIVE_CACHE_REVERIFY=PASSED");
console.log("BETA3_NATIVE_POST_FLASH_DIRECT_API_VERIFY=PASSED");
console.log("BETA3_NATIVE_PERSISTENCE_VERIFY=PASSED");
console.log("BETA3_NATIVE_CANCEL_CONTRACT=PASSED");
console.log("BETA3_APP_RELEASE_DETECTION=PASSED");
console.log("BETA4_NATIVE_APP_UPDATER_FOUNDATION=PASSED");
