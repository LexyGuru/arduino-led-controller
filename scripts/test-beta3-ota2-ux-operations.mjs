import assert from "node:assert/strict";
import {
  buildOta2OperationUx,
  isOta2CancelSafe,
  OTA2_UX_CODES,
} from "../desktop-tauri/src/utils/ota2UxModel.mjs";

for (const stage of ["CHECK", "DOWNLOAD", "VERIFY", "BACKUP", "CONNECT"]) {
  assert.equal(isOta2CancelSafe(stage), true, stage);
}
for (const stage of [
  "UPLOAD", "FLASH", "REBOOT_WAIT", "VERSION_VERIFY",
  "PERSISTENCE_VERIFY", "SUCCESS", "FAILURE",
]) {
  assert.equal(isOta2CancelSafe(stage), false, stage);
}

const blocked = buildOta2OperationUx({
  runtime: { stage: "CHECK", progress: 0 },
  mode: "update",
  result: {
    ok: false,
    code: "X5801",
    policy: { ready: false, code: "X5705", mode: "update" },
  },
});
assert.deepEqual(blocked.blockerKeys, ["beta3.ota2.blocker.backupNotConfigured"]);

const running = buildOta2OperationUx({
  runtime: { stage: "BACKUP", progress: 39 },
  installing: true,
  mode: "update",
});
assert.equal(running.canCancel, true);
assert.equal(running.critical, false);
assert.equal(running.progress, 39);

const critical = buildOta2OperationUx({
  runtime: { stage: "FLASH", progress: 88 },
  installing: true,
  mode: "restore",
});
assert.equal(critical.canCancel, false);
assert.equal(critical.critical, true);
assert.equal(OTA2_UX_CODES.CANCEL_REQUESTED, "X5901");

console.log("BETA3_OTA2_CANCEL_SAFE_WINDOW=PASSED");
console.log("BETA3_OTA2_CRITICAL_PHASE_CANCEL_LOCK=PASSED");
console.log("BETA3_OTA2_BLOCKER_MODEL=PASSED");
console.log("BETA3_OTA2_RESULT_MODEL=PASSED");
console.log("BETA3_OTA2_UX_OPERATIONS_MODEL=PASSED");
