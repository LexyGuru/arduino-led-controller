import assert from "node:assert/strict";
import {
  evaluateOta2LiveInstallPolicy,
  OTA2_LIVE_POLICY_CODES,
} from "../desktop-tauri/src/utils/ota2LiveInstallPolicy.mjs";
import {
  createOta2LiveInstallController,
  OTA2_LIVE_CONTROLLER_CODES,
} from "../desktop-tauri/src/utils/ota2LiveInstallController.mjs";

const firmware = {
  installedVersion: "5.0.0-beta.9",
  arduinoOnline: true,
  otaConfigured: true,
  backupStoreConfigured: true,
};
const artifact = {
  name: "Firmware.bin",
  downloadUrl: "https://example.invalid/fw.bin",
  checksumUrl: "https://example.invalid/fw.sha256",
  firmwareVersion: "5.0.0-beta.10",
  tag: "Arduino_LED_Controller_Firmware_BETA10",
};

const update = evaluateOta2LiveInstallPolicy({
  firmware,
  artifact,
});
assert.equal(update.ready, true);
assert.equal(update.mode, "update");
assert.equal(update.code, OTA2_LIVE_POLICY_CODES.READY_UPDATE);
assert.deepEqual(update.delegatedChecks, [
  "directApiReady",
  "otaReachable",
  "binarySha256Verified",
]);

const reinstall = evaluateOta2LiveInstallPolicy({
  firmware: {
    ...firmware,
    installedVersion: "5.0.0-beta.10",
  },
  artifact,
});
assert.equal(reinstall.ready, true);
assert.equal(reinstall.mode, "reinstall");
assert.equal(reinstall.code, OTA2_LIVE_POLICY_CODES.READY_REINSTALL);

const restore = evaluateOta2LiveInstallPolicy({
  firmware: {
    ...firmware,
    installedVersion: "5.0.0-beta.11",
  },
  artifact,
});
assert.equal(restore.ready, true);
assert.equal(restore.mode, "restore");
assert.equal(restore.code, OTA2_LIVE_POLICY_CODES.READY_RESTORE);

for (const [patch, code] of [
  [{ arduinoOnline: false }, OTA2_LIVE_POLICY_CODES.DEVICE_OFFLINE],
  [{ otaConfigured: false }, OTA2_LIVE_POLICY_CODES.OTA_NOT_CONFIGURED],
  [{ backupStoreConfigured: false }, OTA2_LIVE_POLICY_CODES.BACKUP_NOT_CONFIGURED],
]) {
  const result = evaluateOta2LiveInstallPolicy({
    firmware: { ...firmware, ...patch },
    artifact,
  });
  assert.equal(result.ready, false);
  assert.equal(result.code, code);
}

assert.equal(
  evaluateOta2LiveInstallPolicy({
    firmware,
    artifact: { ...artifact, downloadUrl: "" },
  }).code,
  OTA2_LIVE_POLICY_CODES.ARTIFACT_URL_MISSING,
);
assert.equal(
  evaluateOta2LiveInstallPolicy({
    firmware,
    artifact: { ...artifact, checksumUrl: "" },
  }).code,
  OTA2_LIVE_POLICY_CODES.CHECKSUM_URL_MISSING,
);
assert.equal(
  evaluateOta2LiveInstallPolicy({
    firmware,
    artifact: { ...artifact, metadataConflict: "mismatch" },
  }).code,
  OTA2_LIVE_POLICY_CODES.METADATA_CONFLICT,
);

const before = {
  bootIdAfter: "old",
  scheduleRevisionAfter: 7,
  scheduleChecksumAfter: "same",
};
const after = {
  installedVersion: "5.0.0-beta.10",
  bootIdBefore: "old",
  bootIdAfter: "new",
  scheduleRevisionBefore: 7,
  scheduleRevisionAfter: 7,
  scheduleChecksumBefore: "same",
  scheduleChecksumAfter: "same",
};

let listener = null;
let installCalls = 0;
const runtimeStages = [];
const controller = createOta2LiveInstallController({
  firmwareStatus: async () => before,
  firmwareInstallRelease: async (tag) => {
    installCalls += 1;
    assert.equal(tag, artifact.tag);
    listener?.({ message: "POST /sketch feltöltés", progress: 60 });
    listener?.({ message: "Arduino reboot", progress: 90 });
    return after;
  },
  subscribeProgress: async (fn) => {
    listener = fn;
    return async () => {
      listener = null;
    };
  },
  createBackup: async () => ({
    backupId: "schedule-live-1",
    count: 1,
    revision: 7,
    checksum: "same",
  }),
});
const live = await controller.install({
  firmware,
  artifact,
  onRuntime: (state) => runtimeStages.push(state.stage),
});
assert.equal(live.ok, true);
assert.equal(live.code, OTA2_LIVE_CONTROLLER_CODES.SUCCESS);
assert.equal(live.policy.mode, "update");
assert.equal(live.bridge.postVerify.ok, true);
assert.equal(live.recovery.backupId, "schedule-live-1");
assert.equal(installCalls, 1);
assert.deepEqual(runtimeStages, ["CHECK", "UPLOAD", "REBOOT_WAIT"]);

const blocked = await controller.install({
  firmware: { ...firmware, backupStoreConfigured: false },
  artifact,
});
assert.equal(blocked.ok, false);
assert.equal(blocked.code, OTA2_LIVE_CONTROLLER_CODES.POLICY_BLOCKED);
assert.equal(installCalls, 1);

console.log("BETA3_OTA2_LIVE_POLICY_UPDATE=PASSED");
console.log("BETA3_OTA2_LIVE_POLICY_REINSTALL=PASSED");
console.log("BETA3_OTA2_LIVE_POLICY_RESTORE=PASSED");
console.log("BETA3_OTA2_LIVE_POLICY_LOCAL_GATES=PASSED");
console.log("BETA3_OTA2_LIVE_NATIVE_DELEGATED_GATES=PASSED");
console.log("BETA3_OTA2_LIVE_NATIVE_BRIDGE_SINGLE_INSTALL=PASSED");
console.log("BETA3_OTA2_LIVE_AUTOMATIC_BACKUP=PASSED");
console.log("BETA3_OTA2_LIVE_RUNTIME_PROPAGATION=PASSED");
console.log("BETA3_OTA2_LIVE_POSTVERIFY_PROPAGATION=PASSED");
console.log("BETA3_OTA2_LIVE_UI_RUNTIME_INTEGRATION_MEGA=PASSED");
