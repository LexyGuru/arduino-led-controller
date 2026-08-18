export const OTA2_STAGES = Object.freeze([
  "CHECK",
  "DOWNLOAD",
  "VERIFY",
  "BACKUP",
  "CONNECT",
  "UPLOAD",
  "FLASH",
  "REBOOT_WAIT",
  "VERSION_VERIFY",
  "PERSISTENCE_VERIFY",
  "SUCCESS",
  "FAILURE",
]);

const NEXT = Object.freeze({
  CHECK: ["DOWNLOAD", "FAILURE"],
  DOWNLOAD: ["VERIFY", "FAILURE"],
  VERIFY: ["BACKUP", "FAILURE"],
  BACKUP: ["CONNECT", "FAILURE"],
  CONNECT: ["UPLOAD", "FAILURE"],
  UPLOAD: ["FLASH", "FAILURE"],
  FLASH: ["REBOOT_WAIT", "FAILURE"],
  REBOOT_WAIT: ["VERSION_VERIFY", "FAILURE"],
  VERSION_VERIFY: ["PERSISTENCE_VERIFY", "FAILURE"],
  PERSISTENCE_VERIFY: ["SUCCESS", "FAILURE"],
  SUCCESS: [],
  FAILURE: [],
});

export function isOta2Stage(value) {
  return OTA2_STAGES.includes(value);
}

export function canTransitionOta2(from, to) {
  return Boolean(NEXT[from]?.includes(to));
}

export function createOta2StageState() {
  return Object.freeze({
    stage: "CHECK",
    terminal: false,
    history: Object.freeze(["CHECK"]),
  });
}

export function transitionOta2Stage(state, to) {
  const from = state?.stage;
  if (!isOta2Stage(from) || !isOta2Stage(to)) {
    throw new Error(`OTA2_INVALID_STAGE:${from}->${to}`);
  }
  if (!canTransitionOta2(from, to)) {
    throw new Error(`OTA2_INVALID_TRANSITION:${from}->${to}`);
  }
  const history = Object.freeze([...(state.history ?? []), to]);
  return Object.freeze({
    stage: to,
    terminal: to === "SUCCESS" || to === "FAILURE",
    history,
  });
}
