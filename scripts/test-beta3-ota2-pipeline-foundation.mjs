import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import {
  parseSha256Checksum,
  resolveExpectedSha256,
  verifyFirmwareBytes,
  downloadAndVerifyFirmware,
  OTA2_ARTIFACT_CODES,
} from "../desktop-tauri/src/utils/ota2ArtifactVerification.mjs";
import {
  createOta2StageState,
  transitionOta2Stage,
  canTransitionOta2,
} from "../desktop-tauri/src/utils/ota2StageMachine.mjs";
import {
  runOta2Pipeline,
  OTA2_PIPELINE_CODES,
} from "../desktop-tauri/src/utils/ota2InstallCoordinator.mjs";

const shaAbc =
  "ba7816bf8f01cfea414140de5dae2223" +
  "b00361a396177a9cb410ff61f20015ad";

assert.equal(parseSha256Checksum(shaAbc), shaAbc);
assert.equal(
  parseSha256Checksum(`${shaAbc}  firmware.bin`, "firmware.bin"),
  shaAbc,
);
assert.equal(
  parseSha256Checksum(`SHA256 (firmware.bin) = ${shaAbc}`, "firmware.bin"),
  shaAbc,
);
assert.equal(parseSha256Checksum("not-a-sha"), null);

const checksum = await resolveExpectedSha256({
  checksumUrl: "https://example.invalid/fw.sha256",
  expectedFileName: "firmware.bin",
  fetchImpl: async () => ({
    ok: true,
    text: async () => `${shaAbc}  firmware.bin\n`,
  }),
});
assert.equal(checksum.ok, true);
assert.equal(checksum.sha256, shaAbc);

const bytes = new TextEncoder().encode("abc");
const verified = await verifyFirmwareBytes({
  bytes,
  expectedSha256: shaAbc,
  cryptoImpl: webcrypto,
});
assert.equal(verified.ok, true);
assert.equal(verified.actualSha256, shaAbc);

const mismatch = await verifyFirmwareBytes({
  bytes,
  expectedSha256: "a".repeat(64),
  cryptoImpl: webcrypto,
});
assert.equal(mismatch.ok, false);
assert.equal(mismatch.code, OTA2_ARTIFACT_CODES.BINARY_SHA_MISMATCH);

const downloaded = await downloadAndVerifyFirmware({
  downloadUrl: "https://example.invalid/fw.bin",
  expectedSha256: shaAbc,
  cryptoImpl: webcrypto,
  fetchImpl: async () => ({
    ok: true,
    arrayBuffer: async () =>
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  }),
});
assert.equal(downloaded.ok, true);
assert.equal(downloaded.byteLength, 3);
assert.equal(downloaded.bytes.byteLength, 3);

let machine = createOta2StageState();
for (const next of [
  "DOWNLOAD",
  "VERIFY",
  "BACKUP",
  "CONNECT",
  "UPLOAD",
  "FLASH",
  "REBOOT_WAIT",
  "VERSION_VERIFY",
  "PERSISTENCE_VERIFY",
  "SUCCESS",
]) {
  assert.equal(canTransitionOta2(machine.stage, next), true);
  machine = transitionOta2Stage(machine, next);
}
assert.equal(machine.terminal, true);
assert.equal(machine.history.length, 11);
assert.throws(
  () => transitionOta2Stage(createOta2StageState(), "UPLOAD"),
  /OTA2_INVALID_TRANSITION/,
);

const preflightInput = {
  installedVersion: "5.0.0-beta.9",
  availableVersion: "5.0.0-beta.10",
  deviceOnline: true,
  directApiReady: true,
  otaConfigured: true,
  otaReachable: true,
  backupConfigured: true,
  artifactUrl: "https://example.invalid/fw.bin",
  sha256: shaAbc,
};

const stages = [];
const ok = await runOta2Pipeline({
  preflightInput,
  onStage: (event) => stages.push(event.stage),
  steps: {
    download: async () => ({ bytes }),
    verify: async () => ({ ok: true, code: OTA2_ARTIFACT_CODES.READY }),
    backup: async () => ({ id: "backup-1" }),
    connect: async () => ({ connected: true }),
    upload: async () => ({ sent: bytes.byteLength }),
    flash: async () => ({ accepted: true }),
    waitForReboot: async () => ({ bootChanged: true }),
    verifyVersion: async () => ({ version: "5.0.0-beta.10" }),
    verifyPersistence: async () => ({ schedules: true, settings: true }),
  },
});
assert.equal(ok.ok, true);
assert.equal(ok.code, OTA2_PIPELINE_CODES.SUCCESS);
assert.deepEqual(stages, [
  "CHECK",
  "DOWNLOAD",
  "VERIFY",
  "BACKUP",
  "CONNECT",
  "UPLOAD",
  "FLASH",
  "REBOOT_WAIT",
  "VERSION_VERIFY",
  "PERSISTENCE_VERIFY",
  "SUCCESS",
]);

const preflightFail = await runOta2Pipeline({
  preflightInput: {
    ...preflightInput,
    deviceOnline: false,
  },
  steps: {},
});
assert.equal(preflightFail.ok, false);
assert.equal(preflightFail.code, "X5101");
assert.equal(preflightFail.state.stage, "FAILURE");

const verifyFail = await runOta2Pipeline({
  preflightInput,
  steps: {
    download: async () => ({ bytes }),
    verify: async () => ({
      ok: false,
      code: OTA2_ARTIFACT_CODES.BINARY_SHA_MISMATCH,
    }),
  },
});
assert.equal(verifyFail.ok, false);
assert.equal(verifyFail.code, OTA2_ARTIFACT_CODES.BINARY_SHA_MISMATCH);
assert.equal(verifyFail.state.stage, "FAILURE");
assert.equal(verifyFail.context.backup, null);

console.log("BETA3_OTA2_CHECKSUM_RESOLVER=PASSED");
console.log("BETA3_OTA2_BINARY_SHA256_VERIFY=PASSED");
console.log("BETA3_OTA2_DOWNLOAD_VERIFY_CONTRACT=PASSED");
console.log("BETA3_OTA2_STAGE_MACHINE=PASSED");
console.log("BETA3_OTA2_STAGE_TRANSITION_GUARD=PASSED");
console.log("BETA3_OTA2_PIPELINE_PREFLIGHT_GATE=PASSED");
console.log("BETA3_OTA2_PIPELINE_VERIFY_BEFORE_BACKUP=PASSED");
console.log("BETA3_OTA2_PIPELINE_FULL_SEQUENCE=PASSED");
console.log("BETA3_OTA2_PIPELINE_FOUNDATION_MEGA=PASSED");
