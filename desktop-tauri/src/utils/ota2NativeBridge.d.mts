import type {
  Ota2ProgressLikeEvent,
  Ota2RuntimeState,
} from "./ota2RuntimeState.mjs";

export interface Ota2NativePostVerifyResult {
  ok: boolean;
  code: string;
  checks?: Readonly<Record<string, boolean>>;
  evidence?: Readonly<Record<string, unknown>>;
}

export interface Ota2NativeBridgeResult {
  ok: boolean;
  code: string;
  error?: string;
  postVerify?: Ota2NativePostVerifyResult;
  before?: unknown;
  after?: unknown;
  runtime?: Ota2RuntimeState;
}

export const OTA2_NATIVE_BRIDGE_CODES: Readonly<Record<string, string>>;

export function createOta2NativeBridge(input?: {
  firmwareInstallRelease?: (
    version: string,
    channel?: "stable" | "beta"
  ) => unknown | Promise<unknown>;
  firmwareStatus?: (
    updateChannel?: "stable" | "beta",
    firmwareUpdateChannel?: "stable" | "beta"
  ) => unknown | Promise<unknown>;
  subscribeProgress?: (
    listener: (entry: Ota2ProgressLikeEvent) => void
  ) => (() => void | Promise<void>) | Promise<() => void | Promise<void>>;
}): Readonly<{
  install(input?: {
    version?: string;
    channel?: "stable" | "beta";
    expectedVersion?: string;
    onRuntime?: (runtime: Ota2RuntimeState) => void;
  }): Promise<Ota2NativeBridgeResult>;
}>;
