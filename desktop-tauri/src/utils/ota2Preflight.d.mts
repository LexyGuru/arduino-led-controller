export const OTA2_PREFLIGHT_CODES: Readonly<{
  READY: "X5100";
  DEVICE_OFFLINE: "X5101";
  DIRECT_API_UNAVAILABLE: "X5102";
  OTA_NOT_CONFIGURED: "X5103";
  OTA_UNREACHABLE: "X5104";
  BACKUP_NOT_CONFIGURED: "X5105";
  ARTIFACT_SHA_INVALID: "X5106";
  VERSION_UNKNOWN: "X5110";
  VERSION_CURRENT: "X5111";
  DOWNGRADE_BLOCKED: "X5112";
}>;

export function evaluateOta2Preflight(input?: {
  installedVersion?: unknown;
  availableVersion?: unknown;
  deviceOnline?: boolean;
  directApiReady?: boolean;
  otaConfigured?: boolean;
  otaReachable?: boolean;
  backupConfigured?: boolean;
  artifactUrl?: unknown;
  sha256?: unknown;
}): Readonly<{
  ready: boolean;
  code: string;
  relation: "newer" | "same" | "older" | "unknown";
  action: "update" | "current" | "restore" | "unknown";
  checks: Readonly<Record<string, boolean>>;
  blockers: readonly string[];
  mode: "update" | "reinstall" | "restore" | "unknown";
}>;

export function createOta2PreflightInput(input?: {
  firmware?: unknown;
  directApiReady?: boolean;
  otaReachable?: boolean;
  artifactUrl?: unknown;
  sha256?: unknown;
  availableVersion?: unknown;
}): Readonly<Record<string, unknown>>;
