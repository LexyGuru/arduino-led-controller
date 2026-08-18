export type UpdateCenterSourceKey = "application" | "firmware" | "device" | "ota";
export type UpdateCenterSourceStatus = "idle" | "ready" | "error" | "skipped";
export type UpdateCenterStatus = "idle" | "checking" | "ready" | "partial-error" | "error";
export type FirmwareRelation = "newer" | "same" | "older" | "unknown";
export type FirmwareAction = "update" | "current" | "restore" | "unknown";

export interface UpdateCenterSourceEntry<T = unknown> {
  status: UpdateCenterSourceStatus;
  data: T | null;
  error: string | null;
  updatedAt: string | null;
}

export interface UpdateCenterState {
  busy: boolean;
  status: UpdateCenterStatus;
  checkedAt: string | null;
  sources: Record<UpdateCenterSourceKey, UpdateCenterSourceEntry>;
}

export interface UpdateCenterLoaders {
  application?: () => unknown | Promise<unknown>;
  firmware?: () => unknown | Promise<unknown>;
  device?: () => unknown | Promise<unknown>;
  ota?: () => unknown | Promise<unknown>;
}

export interface FirmwareInstallabilityInput {
  deviceOnline?: boolean;
  directApiReady?: boolean;
  otaConfigured?: boolean;
  otaReachable?: boolean;
  backupConfigured?: boolean;
  artifactUrl?: string | null;
  sha256?: string | null;
  installedVersion?: string | null;
  availableVersion?: string | null;
}

export const UPDATE_CENTER_SOURCE_KEYS: readonly UpdateCenterSourceKey[];
export function createInitialUpdateCenterState(): UpdateCenterState;
export function createRefreshingUpdateCenterState(previousState?: UpdateCenterState): UpdateCenterState;
export function normalizeUpdateCenterError(error: unknown): string;
export function refreshUpdateCenter(
  loaders: UpdateCenterLoaders,
  previousState?: UpdateCenterState,
  now?: () => string,
): Promise<UpdateCenterState>;
export function compareUpdateCenterVersions(leftValue: string | null | undefined, rightValue: string | null | undefined): number | null;
export function classifyFirmwareRelation(
  installedVersion: string | null | undefined,
  availableVersion: string | null | undefined,
): FirmwareRelation;
export function deriveFirmwareAction(input?: FirmwareInstallabilityInput): FirmwareAction;
export function hasVerifiedFirmwareArtifact(input?: FirmwareInstallabilityInput): boolean;
export function evaluateFirmwareInstallability(input?: FirmwareInstallabilityInput): {
  installable: boolean;
  relation: FirmwareRelation;
  action: FirmwareAction;
  checks: Readonly<Record<
    "deviceOnline" | "directApiReady" | "otaConfigured" | "otaReachable" |
    "backupConfigured" | "artifactVerified" | "versionNewer",
    boolean
  >>;
  blockers: string[];
};
