"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("desktop-tauri/src/pages/FirmwarePage.tsx", "utf8");
const bridge = fs.readFileSync("desktop-tauri/src/utils/ota2NativeBridge.mjs", "utf8");
const ux = fs.readFileSync("desktop-tauri/src/utils/ota2UxModel.mjs", "utf8");
const rust = fs.readFileSync("desktop-tauri/src-tauri/src/lib.rs", "utf8");
const visual31 = fs.readFileSync("scripts/test-visual31-mega3-management-experience-v685.js", "utf8");

assert.match(page, /createOta2LiveInstallController/);
assert.match(page, /<Ota2OperationPanel/);
assert.doesNotMatch(page, /visual31-ota-pipeline/);
assert.doesNotMatch(page, /visual31OtaProgress|visual31OtaStage|visual31ActiveStep/);
assert.match(
  page,
  /import \{ localizeOtaMessage, localizeOtaStage \} from '\.\.\/utils\/firmwareOtaLocalization';/
);
assert.ok(
  (page.match(/localizeOtaStage\(/g) || []).length >= 2,
  "remaining status/log UI still requires localizeOtaStage"
);

assert.match(visual31, /<Ota2OperationPanel/);
assert.match(visual31, /assert\.doesNotMatch\(firmware,\/visual31-ota-pipeline\//);
assert.match(visual31, /V685_OTA2_CANONICAL_RUNTIME=PASSED/);
assert.doesNotMatch(visual31, /V685_OTA_PIPELINE_REAL_RUNTIME=PASSED/);

assert.match(bridge, /OTA2_INSTALL_CONFIRMED/);
assert.match(bridge, /stage:"SUCCESS"/);
assert.match(bridge, /level:"success"/);
assert.match(bridge, /progress:100/);
assert.match(bridge, /onRuntime\?\.\(runtime\)/);

assert.match(ux, /const completed = result\?\.ok === true/);
assert.match(ux, /completed \? "SUCCESS" : runtime\?\.stage/);
assert.match(ux, /completed\s*\?\s*100/);

assert.match(
  rust,
  /"Persistence",\s*"success",[\s\S]*?Some\(98\),[\s\S]*?"Kész",\s*"success",[\s\S]*?OTA2_SUCCESS:[\s\S]*?Some\(100\)/
);

assert.match(
  rust,
  /Külső firmware: reboot, Boot ID és schedule persistence ellenőrzés sikeres\.[\s\S]*?Some\(100\)/
);

console.log("OK: one canonical user-facing OTA2 surface");
console.log("OK: remaining OTA status/log localization wiring preserved");
console.log("OK: successful OTA2 postverify forces SUCCESS / 100 / terminal runtime");
console.log("OK: UX result-success cannot remain visually at 98%");
console.log("OK: Rust OTA stream publishes explicit Kész / success / 100%");
console.log("OK: external BIN OTA completion remains intact");
