export type Ota2RuntimeStage =
  | "CHECK"
  | "DOWNLOAD"
  | "VERIFY"
  | "BACKUP"
  | "CONNECT"
  | "UPLOAD"
  | "FLASH"
  | "REBOOT_WAIT"
  | "VERSION_VERIFY"
  | "PERSISTENCE_VERIFY"
  | "SUCCESS"
  | "FAILURE";

export interface Ota2RuntimeEvent {
  timestamp: number;
  stage: Ota2RuntimeStage;
  code: string;
  message: string;
  progress: number;
}

export interface Ota2RuntimeState {
  stage: Ota2RuntimeStage;
  code: string;
  busy: boolean;
  progress: number;
  message: string;
  terminal: boolean;
  error: string | null;
  history: readonly Ota2RuntimeEvent[];
}

export interface Ota2ProgressLikeEvent {
  timestamp?: number;
  stage?: unknown;
  phase?: unknown;
  level?: unknown;
  message?: unknown;
  progress?: unknown;
}

export const OTA2_RUNTIME_CODES: Readonly<Record<string, string>>;
export function ota2RuntimeCodeForStage(stage: Ota2RuntimeStage | string): string;
export function mapOtaProgressToStage(
  entry?: Ota2ProgressLikeEvent
): Ota2RuntimeStage;
export function createOta2RuntimeState(): Ota2RuntimeState;
export function reduceOta2RuntimeEvent(
  state: Ota2RuntimeState,
  event?: Ota2ProgressLikeEvent
): Ota2RuntimeState;
