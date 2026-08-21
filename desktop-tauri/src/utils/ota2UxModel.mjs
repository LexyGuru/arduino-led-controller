export const OTA2_UX_CODES = Object.freeze({
  CANCEL_REQUESTED: "X5901",
  UI_OPERATION_FAILED: "X5902",
});

const CANCEL_SAFE = new Set([
  "CHECK",
  "DOWNLOAD",
  "VERIFY",
  "BACKUP",
  "CONNECT",
]);

const STAGE_KEYS = Object.freeze({
  CHECK: "beta3.ota2.stage.check",
  DOWNLOAD: "beta3.ota2.stage.download",
  VERIFY: "beta3.ota2.stage.verify",
  BACKUP: "beta3.ota2.stage.backup",
  CONNECT: "beta3.ota2.stage.connect",
  UPLOAD: "beta3.ota2.stage.upload",
  FLASH: "beta3.ota2.stage.flash",
  REBOOT_WAIT: "beta3.ota2.stage.rebootWait",
  VERSION_VERIFY: "beta3.ota2.stage.versionVerify",
  PERSISTENCE_VERIFY: "beta3.ota2.stage.persistenceVerify",
  SUCCESS: "beta3.ota2.stage.success",
  FAILURE: "beta3.ota2.stage.failure",
});

const BLOCKERS = Object.freeze({
  X5703: "beta3.ota2.blocker.deviceOffline",
  X5704: "beta3.ota2.blocker.otaNotConfigured",
  X5705: "beta3.ota2.blocker.backupNotConfigured",
  X5706: "beta3.ota2.blocker.artifactMissing",
  X5707: "beta3.ota2.blocker.checksumMissing",
  X5708: "beta3.ota2.blocker.metadataConflict",
  X5709: "beta3.ota2.blocker.versionUnknown",
});

const RESULTS = Object.freeze({
  X5800: "beta3.ota2.result.success",
  X5801: "beta3.ota2.result.blocked",
  X5802: "beta3.ota2.result.failed",
  X5901: "beta3.ota2.result.cancelRequested",
  X5902: "beta3.ota2.result.failed",
});

export function isOta2CancelSafe(stage) {
  return CANCEL_SAFE.has(String(stage ?? ""));
}

export function ota2StageTranslationKey(stage) {
  return STAGE_KEYS[stage] ?? "beta3.ota2.stage.check";
}

export function ota2ModeTranslationKey(mode) {
  if (mode === "reinstall") return "beta3.ota2.mode.reinstall";
  if (mode === "restore") return "beta3.ota2.mode.restore";
  return "beta3.ota2.mode.update";
}

export function ota2ResultTranslationKey(code) {
  return RESULTS[code] ?? "beta3.ota2.result.failed";
}

export function buildOta2OperationUx({
  runtime,
  result,
  mode,
  installing = false,
} = {}) {
  const blocker =
    result?.policy?.ready === false
      ? BLOCKERS[result?.policy?.code] ?? "beta3.ota2.blocker.unknown"
      : null;

  const completed = result?.ok === true;
  return Object.freeze({
    stageKey: ota2StageTranslationKey(completed ? "SUCCESS" : runtime?.stage),
    modeKey: ota2ModeTranslationKey(mode ?? result?.policy?.mode),
    resultKey: result?.code ? ota2ResultTranslationKey(result.code) : null,
    blockerKeys: Object.freeze(blocker ? [blocker] : []),
    canCancel: installing === true && isOta2CancelSafe(runtime?.stage),
    critical: installing === true && !isOta2CancelSafe(runtime?.stage),
    progress: completed
      ? 100
      : Math.max(0, Math.min(100, Number(runtime?.progress ?? 0) || 0)),
  });
}
