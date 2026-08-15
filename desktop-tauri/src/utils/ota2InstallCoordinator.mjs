import {
  evaluateOta2Preflight,
} from "./ota2Preflight.mjs";
import {
  createOta2StageState,
  transitionOta2Stage,
} from "./ota2StageMachine.mjs";

export const OTA2_PIPELINE_CODES = Object.freeze({
  SUCCESS: "X5300",
  STEP_MISSING: "X5301",
  STEP_FAILED: "X5302",
  VERIFY_REJECTED: "X5303",
});

function emit(onStage, state, code = null, detail = null) {
  if (typeof onStage === "function") {
    onStage(Object.freeze({
      stage: state.stage,
      code,
      detail,
      history: state.history,
    }));
  }
}

async function invokeStep(steps, name, context) {
  const fn = steps?.[name];
  if (typeof fn !== "function") {
    throw Object.assign(
      new Error(`OTA2 step missing: ${name}`),
      { code: OTA2_PIPELINE_CODES.STEP_MISSING, step: name },
    );
  }
  return fn(context);
}

export async function runOta2Pipeline({
  preflightInput,
  steps,
  onStage,
} = {}) {
  let state = createOta2StageState();
  emit(onStage, state);

  const preflight = evaluateOta2Preflight(preflightInput);
  if (!preflight.ready) {
    state = transitionOta2Stage(state, "FAILURE");
    emit(onStage, state, preflight.code, preflight);
    return Object.freeze({
      ok: false,
      code: preflight.code,
      state,
      preflight,
    });
  }

  const context = {
    preflight,
    artifact: null,
    verification: null,
    backup: null,
    connection: null,
    upload: null,
    flash: null,
    reboot: null,
    version: null,
    persistence: null,
  };

  const sequence = [
    ["DOWNLOAD", "download", "artifact"],
    ["VERIFY", "verify", "verification"],
    ["BACKUP", "backup", "backup"],
    ["CONNECT", "connect", "connection"],
    ["UPLOAD", "upload", "upload"],
    ["FLASH", "flash", "flash"],
    ["REBOOT_WAIT", "waitForReboot", "reboot"],
    ["VERSION_VERIFY", "verifyVersion", "version"],
    ["PERSISTENCE_VERIFY", "verifyPersistence", "persistence"],
  ];

  try {
    for (const [stage, stepName, key] of sequence) {
      state = transitionOta2Stage(state, stage);
      emit(onStage, state);
      const result = await invokeStep(steps, stepName, Object.freeze({ ...context }));
      context[key] = result;

      if (stage === "VERIFY" && result?.ok !== true) {
        throw Object.assign(
          new Error("OTA2 artifact verification rejected"),
          {
            code:
              result?.code ??
              OTA2_PIPELINE_CODES.VERIFY_REJECTED,
            step: stepName,
          },
        );
      }
    }

    state = transitionOta2Stage(state, "SUCCESS");
    emit(onStage, state, OTA2_PIPELINE_CODES.SUCCESS);
    return Object.freeze({
      ok: true,
      code: OTA2_PIPELINE_CODES.SUCCESS,
      state,
      context: Object.freeze({ ...context }),
      preflight,
    });
  } catch (error) {
    if (state.stage !== "FAILURE") {
      state = transitionOta2Stage(state, "FAILURE");
    }
    const code =
      error?.code ??
      OTA2_PIPELINE_CODES.STEP_FAILED;
    emit(onStage, state, code, {
      step: error?.step ?? null,
      message: String(error?.message ?? error),
    });
    return Object.freeze({
      ok: false,
      code,
      state,
      error: String(error?.message ?? error),
      preflight,
      context: Object.freeze({ ...context }),
    });
  }
}
