import { createOta2NativeBridge } from "./ota2NativeBridge.mjs";
import { createOta2RuntimeState } from "./ota2RuntimeState.mjs";
import { evaluateOta2LiveInstallPolicy } from "./ota2LiveInstallPolicy.mjs";
import { createOta2SingleFlightGuard, OTA2_RESILIENCE_CODES } from "./ota2Resilience.mjs";
import { scrubOta2DiagnosticText } from "./ota2Diagnostics.mjs";

export const OTA2_LIVE_CONTROLLER_CODES = Object.freeze({
  SUCCESS: "X5800",
  POLICY_BLOCKED: "X5801",
  BRIDGE_FAILED: "X5802",
  OPERATION_BUSY: OTA2_RESILIENCE_CODES.OPERATION_BUSY,
  BACKUP_FAILED: OTA2_RESILIENCE_CODES.BACKUP_FAILED,
});

export function createOta2LiveInstallController({
  firmwareInstallRelease,
  firmwareStatus,
  subscribeProgress,
  createBackup,
} = {}) {
  const bridge = createOta2NativeBridge({ firmwareInstallRelease, firmwareStatus, subscribeProgress });
  const singleFlight = createOta2SingleFlightGuard();

  return Object.freeze({
    get busy() { return singleFlight.active; },
    async install({ firmware, artifact, version, onRuntime } = {}) {
      const guarded = await singleFlight.run(async () => {
        const policy = evaluateOta2LiveInstallPolicy({ firmware, artifact, version });
        onRuntime?.(createOta2RuntimeState());
        if (!policy.ready) return Object.freeze({ ok:false, code:OTA2_LIVE_CONTROLLER_CODES.POLICY_BLOCKED, policy, bridge:null, recovery:null });

        let recovery;
        try {
          if (typeof createBackup !== "function") throw new Error("OTA2_BACKUP_CALLBACK_MISSING");
          recovery = await createBackup();
          if (!String(recovery?.backupId ?? "").trim()) throw new Error("OTA2_BACKUP_ID_MISSING");
        } catch (error) {
          return Object.freeze({
            ok:false, code:OTA2_LIVE_CONTROLLER_CODES.BACKUP_FAILED, policy, bridge:null, recovery:null,
            error:scrubOta2DiagnosticText(error?.message ?? error),
          });
        }

        const selectedVersion = policy.availableVersion;
        const installVersion = artifact?.firmwareVersion ?? selectedVersion;
        const channel = artifact?.channel === "stable"
          ? "stable"
          : artifact?.channel === "beta"
            ? "beta"
            : undefined;
        const expectedVersion = artifact?.expectedFirmwareVersion ?? installVersion;
        const result = await bridge.install({ version:installVersion, channel, expectedVersion, onRuntime });
        return Object.freeze({
          ok:result.ok===true,
          code:result.ok===true?OTA2_LIVE_CONTROLLER_CODES.SUCCESS:OTA2_LIVE_CONTROLLER_CODES.BRIDGE_FAILED,
          policy, bridge:result, recovery,
        });
      });

      if (!guarded.accepted) {
        return Object.freeze({ ok:false, code:OTA2_LIVE_CONTROLLER_CODES.OPERATION_BUSY, policy:null, bridge:null, recovery:null });
      }
      return guarded.value;
    },
  });
}
