export const OTA2_STAGES: readonly string[];
export function isOta2Stage(value: unknown): boolean;
export function canTransitionOta2(from: string, to: string): boolean;
export function createOta2StageState(): Readonly<Record<string, unknown>>;
export function transitionOta2Stage(
  state: Readonly<Record<string, unknown>>,
  to: string
): Readonly<Record<string, unknown>>;
