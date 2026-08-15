export const OTA2_PIPELINE_CODES: Readonly<Record<string, string>>;
export function runOta2Pipeline(input?: {
  preflightInput?: Record<string, unknown>;
  steps?: Record<string, (context: Readonly<Record<string, unknown>>) => unknown | Promise<unknown>>;
  onStage?: (event: Readonly<Record<string, unknown>>) => void;
}): Promise<Readonly<Record<string, unknown>>>;
