import type { Ota2RuntimeState } from "./ota2RuntimeState.mjs";
import type { Ota2LiveControllerResult } from "./ota2LiveInstallController.mjs";

export const OTA2_UX_CODES: Readonly<Record<string, string>>;
export function isOta2CancelSafe(stage: unknown): boolean;
export function ota2StageTranslationKey(stage: unknown): string;
export function ota2ModeTranslationKey(mode: unknown): string;
export function ota2ResultTranslationKey(code: unknown): string;
export function buildOta2OperationUx(input?: {
  runtime?: Ota2RuntimeState;
  result?: Ota2LiveControllerResult | null;
  mode?: "update" | "reinstall" | "restore" | null;
  installing?: boolean;
}): Readonly<{
  stageKey: string;
  modeKey: string;
  resultKey: string | null;
  blockerKeys: readonly string[];
  canCancel: boolean;
  critical: boolean;
  progress: number;
}>;
