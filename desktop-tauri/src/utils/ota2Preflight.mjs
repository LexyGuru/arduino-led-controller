import {
  evaluateFirmwareInstallability,
} from "./updateCenterCore.mjs";

export const OTA2_PREFLIGHT_CODES = Object.freeze({
  READY: "X5100",
  DEVICE_OFFLINE: "X5101",
  DIRECT_API_UNAVAILABLE: "X5102",
  OTA_NOT_CONFIGURED: "X5103",
  OTA_UNREACHABLE: "X5104",
  BACKUP_NOT_CONFIGURED: "X5105",
  ARTIFACT_SHA_INVALID: "X5106",
  VERSION_UNKNOWN: "X5110",
  VERSION_CURRENT: "X5111",
  DOWNGRADE_BLOCKED: "X5112",
});

function primaryCode(evaluation) {
  if (!evaluation.checks.deviceOnline) {
    return OTA2_PREFLIGHT_CODES.DEVICE_OFFLINE;
  }
  if (!evaluation.checks.directApiReady) {
    return OTA2_PREFLIGHT_CODES.DIRECT_API_UNAVAILABLE;
  }
  if (!evaluation.checks.otaConfigured) {
    return OTA2_PREFLIGHT_CODES.OTA_NOT_CONFIGURED;
  }
  if (!evaluation.checks.otaReachable) {
    return OTA2_PREFLIGHT_CODES.OTA_UNREACHABLE;
  }
  if (!evaluation.checks.backupConfigured) {
    return OTA2_PREFLIGHT_CODES.BACKUP_NOT_CONFIGURED;
  }
  if (!evaluation.checks.artifactVerified) {
    return OTA2_PREFLIGHT_CODES.ARTIFACT_SHA_INVALID;
  }
  if (evaluation.relation === "older") {
    return OTA2_PREFLIGHT_CODES.DOWNGRADE_BLOCKED;
  }
  if (evaluation.relation === "same") {
    return OTA2_PREFLIGHT_CODES.VERSION_CURRENT;
  }
  if (evaluation.relation === "unknown") {
    return OTA2_PREFLIGHT_CODES.VERSION_UNKNOWN;
  }
  return OTA2_PREFLIGHT_CODES.READY;
}

export function evaluateOta2Preflight(input = {}) {
  const evaluation = evaluateFirmwareInstallability(input);
  const code = primaryCode(evaluation);

  return Object.freeze({
    ready:
      evaluation.installable &&
      code === OTA2_PREFLIGHT_CODES.READY,
    code,
    relation: evaluation.relation,
    action: evaluation.action,
    checks: evaluation.checks,
    blockers: Object.freeze([...evaluation.blockers]),
    mode:
      evaluation.relation === "older"
        ? "restore"
        : evaluation.relation === "same"
          ? "reinstall"
          : evaluation.relation === "newer"
            ? "update"
            : "unknown",
  });
}

export function createOta2PreflightInput({
  firmware = null,
  directApiReady = false,
  otaReachable = false,
  artifactUrl = null,
  sha256 = null,
  availableVersion = null,
} = {}) {
  const available =
    availableVersion ??
    firmware?.availableFirmware?.firmwareVersion ??
    firmware?.availableFirmware?.version ??
    firmware?.availableFirmware?.tag ??
    null;

  return Object.freeze({
    installedVersion: firmware?.installedVersion ?? null,
    availableVersion: available,
    deviceOnline: firmware?.arduinoOnline === true,
    directApiReady: directApiReady === true,
    otaConfigured: firmware?.otaConfigured === true,
    otaReachable: otaReachable === true,
    backupConfigured:
      firmware?.backupStoreConfigured === true,
    artifactUrl,
    sha256,
  });
}
