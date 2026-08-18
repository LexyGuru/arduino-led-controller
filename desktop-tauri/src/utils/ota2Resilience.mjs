export const OTA2_RESILIENCE_CODES = Object.freeze({
  RETRY_EXHAUSTED: "X6001",
  OPERATION_BUSY: "X6002",
  BACKUP_FAILED: "X6003",
});

export function isRetryableReadError(error) {
  const status = Number(error?.status ?? error?.statusCode ?? 0);
  return status === 408 || status === 425 || status === 429 || status >= 500;
}

export async function withBoundedReadRetry(operation, {
  attempts = 3,
  baseDelayMs = 200,
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  shouldRetry = isRetryableReadError,
} = {}) {
  if (typeof operation !== "function") throw new TypeError("operation must be a function");
  const max = Math.max(1, Math.min(4, Number(attempts) || 1));
  let lastError;
  for (let index = 0; index < max; index += 1) {
    try { return await operation(index + 1); }
    catch (error) {
      lastError = error;
      if (index + 1 >= max || !shouldRetry(error)) throw error;
      await sleep(Math.max(0, Number(baseDelayMs) || 0) * (2 ** index));
    }
  }
  throw lastError;
}

export function createOta2SingleFlightGuard() {
  let active = false;
  return Object.freeze({
    get active() { return active; },
    async run(operation) {
      if (active) return Object.freeze({ accepted: false, code: OTA2_RESILIENCE_CODES.OPERATION_BUSY });
      active = true;
      try { return Object.freeze({ accepted: true, value: await operation() }); }
      finally { active = false; }
    },
  });
}
