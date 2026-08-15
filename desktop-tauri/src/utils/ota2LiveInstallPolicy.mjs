import { getUpdateRelation } from "./updateVersion.mjs";

export const OTA2_LIVE_POLICY_CODES = Object.freeze({
  READY_UPDATE: "X5700",
  READY_REINSTALL: "X5701",
  READY_RESTORE: "X5702",
  DEVICE_OFFLINE: "X5703",
  OTA_NOT_CONFIGURED: "X5704",
  BACKUP_NOT_CONFIGURED: "X5705",
  ARTIFACT_URL_MISSING: "X5706",
  CHECKSUM_URL_MISSING: "X5707",
  METADATA_CONFLICT: "X5708",
  VERSION_UNKNOWN: "X5709",
});

export function evaluateOta2LiveInstallPolicy({
  firmware = null,
  artifact = null,
  version = null,
} = {}) {
  const installedVersion = firmware?.installedVersion ?? null;
  const availableVersion =
    version ??
    artifact?.firmwareVersion ??
    artifact?.tag ??
    null;
  const relation = getUpdateRelation(
    availableVersion,
    installedVersion,
  );

  const checks = Object.freeze({
    deviceOnline: firmware?.arduinoOnline === true,
    otaConfigured: firmware?.otaConfigured === true,
    backupConfigured:
      firmware?.backupStoreConfigured === true,
    artifactUrl:
      Boolean(String(artifact?.downloadUrl ?? "").trim()),
    checksumUrl:
      Boolean(String(artifact?.checksumUrl ?? "").trim()),
    metadataClean:
      !String(artifact?.metadataConflict ?? "").trim(),
  });

  let code =
    relation === "newer"
      ? OTA2_LIVE_POLICY_CODES.READY_UPDATE
      : relation === "same"
        ? OTA2_LIVE_POLICY_CODES.READY_REINSTALL
        : relation === "older"
          ? OTA2_LIVE_POLICY_CODES.READY_RESTORE
          : OTA2_LIVE_POLICY_CODES.VERSION_UNKNOWN;

  if (!checks.deviceOnline) {
    code = OTA2_LIVE_POLICY_CODES.DEVICE_OFFLINE;
  } else if (!checks.otaConfigured) {
    code = OTA2_LIVE_POLICY_CODES.OTA_NOT_CONFIGURED;
  } else if (!checks.backupConfigured) {
    code = OTA2_LIVE_POLICY_CODES.BACKUP_NOT_CONFIGURED;
  } else if (!checks.artifactUrl) {
    code = OTA2_LIVE_POLICY_CODES.ARTIFACT_URL_MISSING;
  } else if (!checks.checksumUrl) {
    code = OTA2_LIVE_POLICY_CODES.CHECKSUM_URL_MISSING;
  } else if (!checks.metadataClean) {
    code = OTA2_LIVE_POLICY_CODES.METADATA_CONFLICT;
  }

  const ready = [
    OTA2_LIVE_POLICY_CODES.READY_UPDATE,
    OTA2_LIVE_POLICY_CODES.READY_REINSTALL,
    OTA2_LIVE_POLICY_CODES.READY_RESTORE,
  ].includes(code);

  return Object.freeze({
    ready,
    code,
    relation,
    mode:
      relation === "newer"
        ? "update"
        : relation === "same"
          ? "reinstall"
          : relation === "older"
            ? "restore"
            : "unknown",
    installedVersion,
    availableVersion,
    checks,
    delegatedChecks: Object.freeze([
      "directApiReady",
      "otaReachable",
      "binarySha256Verified",
    ]),
  });
}
