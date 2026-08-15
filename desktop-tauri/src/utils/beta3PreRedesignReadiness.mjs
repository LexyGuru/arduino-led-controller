export const BETA3_READINESS_CODES = Object.freeze({
  OTA2_CORE_READY: "X6100",
  APP_UPDATER_DEFERRED: "X6101",
  REDESIGN_READY: "X6102",
});

export function evaluateBeta3PreRedesignReadiness(input = {}) {
  const checks = Object.freeze({
    updateCenter: input.updateCenter === true,
    preflight: input.preflight === true,
    shaVerification: input.shaVerification === true,
    automaticScheduleBackup: input.automaticScheduleBackup === true,
    cancelSafety: input.cancelSafety === true,
    postFlashVerification: input.postFlashVerification === true,
    diagnosticsScrub: input.diagnosticsScrub === true,
    operationSingleFlight: input.operationSingleFlight === true,
    audit: input.audit === true,
  });
  const blocking = Object.entries(checks).filter(([,ok]) => !ok).map(([key]) => key);
  const ota2CoreReady = blocking.length === 0;
  return Object.freeze({
    ota2CoreReady,
    redesignReady: ota2CoreReady,
    code: ota2CoreReady ? BETA3_READINESS_CODES.REDESIGN_READY : BETA3_READINESS_CODES.OTA2_CORE_READY,
    checks,
    blocking: Object.freeze(blocking),
    deferred: Object.freeze([
      "native application self-updater installation",
      "Beta.3 version bump",
      "publish/release",
    ]),
    deferredCode: BETA3_READINESS_CODES.APP_UPDATER_DEFERRED,
  });
}
