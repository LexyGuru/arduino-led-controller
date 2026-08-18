import assert from "node:assert/strict";
import {
  createOta2PreflightInput,
  evaluateOta2Preflight,
  OTA2_PREFLIGHT_CODES,
} from "../desktop-tauri/src/utils/ota2Preflight.mjs";

const sha = "a".repeat(64);

const ready = evaluateOta2Preflight({
  installedVersion: "5.0.0-beta.9",
  availableVersion: "5.0.0-beta.10",
  deviceOnline: true,
  directApiReady: true,
  otaConfigured: true,
  otaReachable: true,
  backupConfigured: true,
  artifactUrl: "https://example.invalid/fw.bin",
  sha256: sha,
});
assert.equal(ready.ready, true);
assert.equal(ready.code, OTA2_PREFLIGHT_CODES.READY);
assert.equal(ready.relation, "newer");
assert.equal(ready.mode, "update");
assert.deepEqual(ready.blockers, []);

const cases = [
  ["deviceOnline", OTA2_PREFLIGHT_CODES.DEVICE_OFFLINE],
  ["directApiReady", OTA2_PREFLIGHT_CODES.DIRECT_API_UNAVAILABLE],
  ["otaConfigured", OTA2_PREFLIGHT_CODES.OTA_NOT_CONFIGURED],
  ["otaReachable", OTA2_PREFLIGHT_CODES.OTA_UNREACHABLE],
  ["backupConfigured", OTA2_PREFLIGHT_CODES.BACKUP_NOT_CONFIGURED],
];
for (const [field, code] of cases) {
  const input = {
    installedVersion: "5.0.0-beta.9",
    availableVersion: "5.0.0-beta.10",
    deviceOnline: true,
    directApiReady: true,
    otaConfigured: true,
    otaReachable: true,
    backupConfigured: true,
    artifactUrl: "https://example.invalid/fw.bin",
    sha256: sha,
  };
  input[field] = false;
  const result = evaluateOta2Preflight(input);
  assert.equal(result.ready, false);
  assert.equal(result.code, code);
  assert.ok(result.blockers.includes(field));
}

const badArtifact = evaluateOta2Preflight({
  installedVersion: "5.0.0-beta.9",
  availableVersion: "5.0.0-beta.10",
  deviceOnline: true,
  directApiReady: true,
  otaConfigured: true,
  otaReachable: true,
  backupConfigured: true,
  artifactUrl: "",
  sha256: "1234",
});
assert.equal(badArtifact.ready, false);
assert.equal(
  badArtifact.code,
  OTA2_PREFLIGHT_CODES.ARTIFACT_SHA_INVALID,
);

const current = evaluateOta2Preflight({
  installedVersion: "5.0.0-beta.9",
  availableVersion: "5.0.0-beta.9",
  deviceOnline: true,
  directApiReady: true,
  otaConfigured: true,
  otaReachable: true,
  backupConfigured: true,
  artifactUrl: "https://example.invalid/fw.bin",
  sha256: sha,
});
assert.equal(current.ready, false);
assert.equal(current.mode, "reinstall");
assert.equal(current.code, OTA2_PREFLIGHT_CODES.VERSION_CURRENT);

const downgrade = evaluateOta2Preflight({
  installedVersion: "5.0.0-beta.10",
  availableVersion: "5.0.0-beta.9",
  deviceOnline: true,
  directApiReady: true,
  otaConfigured: true,
  otaReachable: true,
  backupConfigured: true,
  artifactUrl: "https://example.invalid/fw.bin",
  sha256: sha,
});
assert.equal(downgrade.ready, false);
assert.equal(downgrade.mode, "restore");
assert.equal(
  downgrade.code,
  OTA2_PREFLIGHT_CODES.DOWNGRADE_BLOCKED,
);

const unknown = evaluateOta2Preflight({
  installedVersion: "bad",
  availableVersion: "5.0.0-beta.10",
  deviceOnline: true,
  directApiReady: true,
  otaConfigured: true,
  otaReachable: true,
  backupConfigured: true,
  artifactUrl: "https://example.invalid/fw.bin",
  sha256: sha,
});
assert.equal(unknown.ready, false);
assert.equal(unknown.code, OTA2_PREFLIGHT_CODES.VERSION_UNKNOWN);

const adapted = createOta2PreflightInput({
  firmware: {
    installedVersion: "5.0.0-beta.9",
    availableFirmware: {
      firmwareVersion: "5.0.0-beta.10",
    },
    arduinoOnline: true,
    otaConfigured: true,
    backupStoreConfigured: true,
  },
  directApiReady: true,
  otaReachable: true,
  artifactUrl: "https://example.invalid/fw.bin",
  sha256: sha,
});
assert.equal(adapted.installedVersion, "5.0.0-beta.9");
assert.equal(adapted.availableVersion, "5.0.0-beta.10");
assert.equal(adapted.deviceOnline, true);
assert.equal(adapted.directApiReady, true);
assert.equal(adapted.otaConfigured, true);
assert.equal(adapted.otaReachable, true);
assert.equal(adapted.backupConfigured, true);

console.log("BETA3_OTA2_PREFLIGHT_ALL_READY=PASSED");
console.log("BETA3_OTA2_PREFLIGHT_DEVICE_GATE=PASSED");
console.log("BETA3_OTA2_PREFLIGHT_DIRECT_API_GATE=PASSED");
console.log("BETA3_OTA2_PREFLIGHT_OTA_CONFIG_GATE=PASSED");
console.log("BETA3_OTA2_PREFLIGHT_OTA_REACHABILITY_GATE=PASSED");
console.log("BETA3_OTA2_PREFLIGHT_BACKUP_GATE=PASSED");
console.log("BETA3_OTA2_PREFLIGHT_ARTIFACT_SHA_METADATA_GATE=PASSED");
console.log("BETA3_OTA2_PREFLIGHT_NORMAL_DOWNGRADE_BLOCKED=PASSED");
console.log("BETA3_OTA2_PREFLIGHT_STABLE_CODES=PASSED");
console.log("BETA3_OTA2_PREFLIGHT_GATE_FOUNDATION=PASSED");
