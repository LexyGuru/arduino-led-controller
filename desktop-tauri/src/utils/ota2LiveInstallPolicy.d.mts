export type Ota2LiveRelation =
  | "newer"
  | "same"
  | "older"
  | "unknown";

export type Ota2LiveMode =
  | "update"
  | "reinstall"
  | "restore"
  | "unknown";

export interface Ota2LiveInstallPolicyResult {
  ready: boolean;
  code: string;
  relation: Ota2LiveRelation;
  mode: Ota2LiveMode;
  installedVersion: string | null;
  availableVersion: string | null;
  checks: Readonly<{
    deviceOnline: boolean;
    otaConfigured: boolean;
    backupConfigured: boolean;
    artifactUrl: boolean;
    checksumUrl: boolean;
    metadataClean: boolean;
  }>;
  delegatedChecks: readonly string[];
}

export const OTA2_LIVE_POLICY_CODES: Readonly<Record<string, string>>;
export function evaluateOta2LiveInstallPolicy(
  input?: Record<string, unknown>
): Ota2LiveInstallPolicyResult;
