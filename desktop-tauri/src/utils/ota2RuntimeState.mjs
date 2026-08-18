export const OTA2_RUNTIME_CODES = Object.freeze({
  IDLE: "X5400",
  CHECK: "X5401",
  DOWNLOAD: "X5402",
  VERIFY: "X5403",
  BACKUP: "X5404",
  CONNECT: "X5405",
  UPLOAD: "X5406",
  FLASH: "X5407",
  REBOOT_WAIT: "X5408",
  VERSION_VERIFY: "X5409",
  PERSISTENCE_VERIFY: "X5410",
  SUCCESS: "X5411",
  FAILURE: "X5499",
});

const STAGE_BY_TEXT = Object.freeze([
  ["PERSISTENCE_VERIFY", ["persistence", "schedule checksum", "schedule revision"]],
  ["VERSION_VERIFY", ["version verify", "firmware version", "várt firmware", "expected firmware"]],
  ["REBOOT_WAIT", ["reboot", "restart", "újraind", "life sign", "életjelet", "boot"]],
  ["FLASH", ["flash", "flashing"]],
  ["UPLOAD", ["upload", "feltölt", "post /sketch", "binary transfer"]],
  ["CONNECT", ["connect", "kapcsolód", "ota prepare", "prepare"]],
  ["BACKUP", ["backup", "snapshot", "mentés"]],
  ["VERIFY", ["verify", "sha-256", "sha256", "checksum"]],
  ["DOWNLOAD", ["download", "letölt"]],
  ["CHECK", ["check", "preflight", "ellenőrz"]],
]);

export function ota2RuntimeCodeForStage(stage) {
  return OTA2_RUNTIME_CODES[stage] ?? OTA2_RUNTIME_CODES.IDLE;
}
export function mapOtaProgressToStage(entry = {}) {
  const level = String(entry?.level ?? "").toLowerCase();
  if (level === "error" || level === "failure") return "FAILURE";
  if (level === "success") return "SUCCESS";
  const haystack = [entry?.stage, entry?.phase, entry?.message]
    .map((v) => String(v ?? "").toLowerCase()).join(" ");
  for (const [stage, needles] of STAGE_BY_TEXT) {
    if (needles.some((needle) => haystack.includes(needle))) return stage;
  }
  return "CHECK";
}
export function createOta2RuntimeState() {
  return Object.freeze({
    stage: "CHECK",
    code: OTA2_RUNTIME_CODES.CHECK,
    busy: false,
    progress: 0,
    message: "",
    terminal: false,
    error: null,
    history: Object.freeze([]),
  });
}
export function reduceOta2RuntimeEvent(state, event = {}) {
  const stage = mapOtaProgressToStage(event);
  const raw = Number(event?.progress);
  const progress = Number.isFinite(raw)
    ? Math.max(0, Math.min(100, raw))
    : state?.progress ?? 0;
  const terminal = stage === "SUCCESS" || stage === "FAILURE";
  const item = Object.freeze({
    timestamp: Number(event?.timestamp ?? Date.now()),
    stage,
    code: ota2RuntimeCodeForStage(stage),
    message: String(event?.message ?? ""),
    progress,
  });
  return Object.freeze({
    stage,
    code: item.code,
    busy: !terminal,
    progress: stage === "SUCCESS" ? 100 : progress,
    message: item.message,
    terminal,
    error: stage === "FAILURE" ? item.message || "OTA2 failure" : null,
    history: Object.freeze([...(state?.history ?? []), item]),
  });
}
