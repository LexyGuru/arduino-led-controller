import assert from "node:assert/strict";
import {
  UPDATE_CENTER_SOURCE_KEYS,
  classifyFirmwareRelation,
  compareUpdateCenterVersions,
  createInitialUpdateCenterState,
  createRefreshingUpdateCenterState,
  deriveFirmwareAction,
  evaluateFirmwareInstallability,
  hasVerifiedFirmwareArtifact,
  refreshUpdateCenter,
} from "../desktop-tauri/src/utils/updateCenterCore.mjs";

assert.deepEqual(UPDATE_CENTER_SOURCE_KEYS, [
  "application",
  "firmware",
  "device",
  "ota",
]);

const initial = createInitialUpdateCenterState();
assert.equal(initial.busy, false);
assert.equal(initial.status, "idle");
assert.equal(createRefreshingUpdateCenterState(initial).status, "checking");
assert.equal(createRefreshingUpdateCenterState(initial).busy, true);

assert.equal(compareUpdateCenterVersions("5.0.0-beta.10", "5.0.0-beta.9"), 1);
assert.equal(compareUpdateCenterVersions("5.0.0", "5.0.0-beta.99"), 1);
assert.equal(compareUpdateCenterVersions("5.0.0-beta.9", "5.0.0-beta.10"), -1);
assert.equal(compareUpdateCenterVersions("invalid", "5.0.0-beta.10"), null);

assert.equal(classifyFirmwareRelation("5.0.0-beta.9", "5.0.0-beta.10"), "newer");
assert.equal(classifyFirmwareRelation("5.0.0-beta.99", "5.0.0"), "newer");
assert.equal(classifyFirmwareRelation("5.0.0-beta.9", "5.0.0-beta.9"), "same");
assert.equal(classifyFirmwareRelation("5.0.0-beta.10", "5.0.0-beta.9"), "older");
assert.equal(classifyFirmwareRelation("", "5.0.0-beta.9"), "unknown");

assert.equal(deriveFirmwareAction({
  installedVersion: "5.0.0-beta.9",
  availableVersion: "5.0.0-beta.10",
}), "update");
assert.equal(deriveFirmwareAction({
  installedVersion: "5.0.0-beta.10",
  availableVersion: "5.0.0-beta.9",
}), "restore");

const validSha = "a".repeat(64);
assert.equal(hasVerifiedFirmwareArtifact({
  artifactUrl: "https://example.invalid/fw.bin",
  sha256: validSha,
}), true);
assert.equal(hasVerifiedFirmwareArtifact({
  artifactUrl: "https://example.invalid/fw.bin",
  sha256: "missing",
}), false);

const installable = evaluateFirmwareInstallability({
  deviceOnline: true,
  directApiReady: true,
  otaConfigured: true,
  otaReachable: true,
  backupConfigured: true,
  artifactUrl: "https://example.invalid/fw.bin",
  sha256: validSha,
  installedVersion: "5.0.0-beta.9",
  availableVersion: "5.0.0-beta.10",
});
assert.equal(installable.installable, true);
assert.equal(installable.action, "update");
assert.deepEqual(installable.blockers, []);

const downgrade = evaluateFirmwareInstallability({
  deviceOnline: true,
  directApiReady: true,
  otaConfigured: true,
  otaReachable: true,
  backupConfigured: true,
  artifactUrl: "https://example.invalid/fw.bin",
  sha256: validSha,
  installedVersion: "5.0.0-beta.10",
  availableVersion: "5.0.0-beta.9",
});
assert.equal(downgrade.installable, false);
assert.equal(downgrade.action, "restore");
assert.ok(downgrade.blockers.includes("versionNewer"));

const missingSha = evaluateFirmwareInstallability({
  deviceOnline: true,
  directApiReady: true,
  otaConfigured: true,
  otaReachable: true,
  backupConfigured: true,
  artifactUrl: "https://example.invalid/fw.bin",
  sha256: null,
  installedVersion: "5.0.0-beta.9",
  availableVersion: "5.0.0-beta.10",
});
assert.equal(missingSha.installable, false);
assert.ok(missingSha.blockers.includes("artifactVerified"));

const fixedNow = () => "2026-08-15T04:40:00.000Z";
const allReady = await refreshUpdateCenter({
  application: async () => ({ version: "5.5.1-beta.3" }),
  firmware: async () => ({ version: "5.0.0-beta.10" }),
  device: async () => ({ online: true }),
  ota: async () => ({ reachable: true }),
}, initial, fixedNow);
assert.equal(allReady.status, "ready");
assert.equal(allReady.busy, false);
assert.equal(allReady.sources.application.status, "ready");
assert.equal(allReady.sources.firmware.status, "ready");
assert.equal(allReady.sources.device.status, "ready");
assert.equal(allReady.sources.ota.status, "ready");

const partial = await refreshUpdateCenter({
  application: async () => { throw new Error("app-catalog-down"); },
  firmware: async () => ({ version: "5.0.0-beta.10" }),
  device: async () => ({ online: true }),
  ota: async () => ({ reachable: true }),
}, allReady, fixedNow);
assert.equal(partial.status, "partial-error");
assert.equal(partial.sources.application.status, "error");
assert.equal(partial.sources.application.error, "app-catalog-down");
assert.deepEqual(
  partial.sources.application.data,
  allReady.sources.application.data,
  "last successful source data must survive an isolated refresh failure",
);
assert.equal(partial.sources.firmware.status, "ready");
assert.equal(partial.sources.device.status, "ready");
assert.equal(partial.sources.ota.status, "ready");

const allFailed = await refreshUpdateCenter({
  application: async () => { throw new Error("a"); },
  firmware: async () => { throw new Error("f"); },
  device: async () => { throw new Error("d"); },
  ota: async () => { throw new Error("o"); },
}, initial, fixedNow);
assert.equal(allFailed.status, "error");

console.log("BETA3_UPDATE_CENTER_REFRESH_AGGREGATION=PASSED");
console.log("BETA3_PARTIAL_SOURCE_FAILURE_ISOLATION=PASSED");
console.log("BETA3_LAST_GOOD_SOURCE_DATA_PRESERVED=PASSED");
console.log("BETA3_FIRMWARE_NO_DOWNGRADE_GATE=PASSED");
console.log("BETA3_FIRMWARE_SHA256_INSTALL_GATE=PASSED");
console.log("BETA3_UPDATE_CENTER_FUNCTIONAL_CORE=PASSED");
