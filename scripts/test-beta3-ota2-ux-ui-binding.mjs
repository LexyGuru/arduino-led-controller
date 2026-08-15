import assert from "node:assert/strict";
import fs from "node:fs";

const page = fs.readFileSync("desktop-tauri/src/pages/FirmwarePage.tsx", "utf8");
const panel = fs.readFileSync("desktop-tauri/src/components/v55/Ota2OperationPanel.tsx", "utf8");
const i18n = fs.readFileSync("desktop-tauri/src/i18n/runtime.ts", "utf8");
const css = fs.readFileSync("desktop-tauri/src/v551-beta3-update-center.css", "utf8");
const n = page.replace(/\s+/g, "");

for (const marker of [
  "Ota2OperationPanel",
  "runAudited",
  "ota2Installing",
  "ota2SelectedMode",
  "setOta2Installing(true)",
  "setOta2Installing(false)",
  "awaitrunAudited(",
  "awaitstate.cancel()",
  "isOta2CancelSafe(ota2Runtime.stage)",
  "state.busy||ota2Installing",
  "busy={state.busy||ota2Installing}",
]) assert.ok(n.includes(marker), marker);

assert.ok(!page.includes('data-ota2-runtime="live"'));

for (const marker of [
  "beta3-ota2-operation",
  "beta3-ota2-summary",
  "beta3-ota2-progress",
  "beta3-ota2-blockers",
  "beta3-ota2-history",
]) assert.ok(panel.includes(marker), marker);

for (const key of [
  "beta3.ota2.title",
  "beta3.ota2.stage.flash",
  "beta3.ota2.mode.update",
  "beta3.ota2.mode.reinstall",
  "beta3.ota2.mode.restore",
  "beta3.ota2.blocker.backupNotConfigured",
  "beta3.ota2.result.success",
  "beta3.ota2.cancel",
  "beta3.ota2.criticalNoCancel",
  "beta3.ota2.operationsLog",
]) {
  assert.equal(i18n.split(key).length - 1, 3, key);
}

for (const marker of [
  ".beta3-ota2-operation",
  ".beta3-ota2-progress",
  ".beta3-ota2-history",
]) assert.ok(css.includes(marker), marker);

console.log("BETA3_OTA2_OPERATION_PANEL=PASSED");
console.log("BETA3_OTA2_INSTALL_LOCK=PASSED");
console.log("BETA3_OTA2_CANCEL_INTEGRATION=PASSED");
console.log("BETA3_OTA2_AUDIT_INTEGRATION=PASSED");
console.log("BETA3_OTA2_OPERATIONS_LOG=PASSED");
console.log("BETA3_OTA2_UX_I18N_HU_EN_DE=PASSED");
console.log("BETA3_OTA2_UX_CSS=PASSED");
console.log("BETA3_OTA2_UX_OPERATIONS_MEGA=PASSED");
