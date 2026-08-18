function parseUpdateVersion(value) {
  const text = String(value ?? "").trim();
  const match = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$/.exec(text);
  if (!match) return null;

  const prerelease = match[4]
    ? match[4].split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part))
    : [];

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease,
  };
}

function comparePrerelease(a, b) {
  if (a.length === 0 && b.length === 0) return 0;
  if (a.length === 0) return 1;
  if (b.length === 0) return -1;

  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    if (i >= a.length) return -1;
    if (i >= b.length) return 1;

    const left = a[i];
    const right = b[i];
    if (left === right) continue;

    const leftNumber = typeof left === "number";
    const rightNumber = typeof right === "number";
    if (leftNumber && rightNumber) return left > right ? 1 : -1;
    if (leftNumber !== rightNumber) return leftNumber ? -1 : 1;

    const order = String(left).localeCompare(String(right), "en");
    if (order !== 0) return order > 0 ? 1 : -1;
  }
  return 0;
}

export function compareUpdateCenterVersions(leftValue, rightValue) {
  const left = parseUpdateVersion(leftValue);
  const right = parseUpdateVersion(rightValue);
  if (!left || !right) return null;

  for (const key of ["major", "minor", "patch"]) {
    if (left[key] !== right[key]) return left[key] > right[key] ? 1 : -1;
  }
  return comparePrerelease(left.prerelease, right.prerelease);
}

export const UPDATE_CENTER_SOURCE_KEYS = Object.freeze([
  "application",
  "firmware",
  "device",
  "ota",
]);

function sourceEntry(status, data = null, error = null, updatedAt = null) {
  return Object.freeze({ status, data, error, updatedAt });
}

export function createInitialUpdateCenterState() {
  return {
    busy: false,
    status: "idle",
    checkedAt: null,
    sources: Object.fromEntries(
      UPDATE_CENTER_SOURCE_KEYS.map((key) => [key, sourceEntry("idle")]),
    ),
  };
}

export function createRefreshingUpdateCenterState(previousState = createInitialUpdateCenterState()) {
  return {
    ...previousState,
    busy: true,
    status: "checking",
  };
}

export function normalizeUpdateCenterError(error) {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object" && "message" in error) {
    const value = String(error.message ?? "").trim();
    if (value) return value;
  }
  return "unknown-error";
}

function previousData(previousState, key) {
  const entry = previousState?.sources?.[key];
  return entry?.status === "ready" || entry?.data != null ? entry.data : null;
}

export async function refreshUpdateCenter(
  loaders,
  previousState = createInitialUpdateCenterState(),
  now = () => new Date().toISOString(),
) {
  const startedAt = now();
  const tasks = UPDATE_CENTER_SOURCE_KEYS.map(async (key) => {
    const loader = loaders?.[key];
    if (typeof loader !== "function") {
      return {
        key,
        skipped: true,
      };
    }

    try {
      const data = await loader();
      return { key, data };
    } catch (error) {
      return { key, error };
    }
  });

  const results = await Promise.all(tasks);
  const sources = {};
  let readyCount = 0;
  let errorCount = 0;

  for (const result of results) {
    if (result.skipped) {
      sources[result.key] = sourceEntry(
        "skipped",
        previousData(previousState, result.key),
        null,
        null,
      );
      continue;
    }

    if ("error" in result) {
      errorCount += 1;
      sources[result.key] = sourceEntry(
        "error",
        previousData(previousState, result.key),
        normalizeUpdateCenterError(result.error),
        null,
      );
      continue;
    }

    readyCount += 1;
    sources[result.key] = sourceEntry("ready", result.data, null, startedAt);
  }

  let status = "ready";
  if (errorCount > 0 && readyCount > 0) status = "partial-error";
  else if (errorCount > 0 && readyCount === 0) status = "error";
  else if (readyCount === 0) status = "idle";

  return {
    busy: false,
    status,
    checkedAt: startedAt,
    sources,
  };
}

export function classifyFirmwareRelation(installedVersion, availableVersion) {
  const installed = String(installedVersion ?? "").trim();
  const available = String(availableVersion ?? "").trim();
  if (!installed || !available) return "unknown";

  const comparison = compareUpdateCenterVersions(available, installed);
  if (comparison == null || Number.isNaN(comparison)) return "unknown";
  if (comparison > 0) return "newer";
  if (comparison < 0) return "older";
  return "same";
}

export function deriveFirmwareAction({ installedVersion, availableVersion } = {}) {
  const relation = classifyFirmwareRelation(installedVersion, availableVersion);
  if (relation === "newer") return "update";
  if (relation === "same") return "current";
  if (relation === "older") return "restore";
  return "unknown";
}

export function hasVerifiedFirmwareArtifact({ artifactUrl, sha256 } = {}) {
  const url = String(artifactUrl ?? "").trim();
  const digest = String(sha256 ?? "").trim().toLowerCase();
  return Boolean(url) && /^[a-f0-9]{64}$/.test(digest);
}

export function evaluateFirmwareInstallability(input = {}) {
  const relation = classifyFirmwareRelation(
    input.installedVersion,
    input.availableVersion,
  );

  const checks = Object.freeze({
    deviceOnline: input.deviceOnline === true,
    directApiReady: input.directApiReady === true,
    otaConfigured: input.otaConfigured === true,
    otaReachable: input.otaReachable === true,
    backupConfigured: input.backupConfigured === true,
    artifactVerified: hasVerifiedFirmwareArtifact(input),
    versionNewer: relation === "newer",
  });

  const blockers = Object.entries(checks)
    .filter(([, passed]) => !passed)
    .map(([key]) => key);

  return {
    installable: blockers.length === 0,
    relation,
    action: deriveFirmwareAction(input),
    checks,
    blockers,
  };
}
