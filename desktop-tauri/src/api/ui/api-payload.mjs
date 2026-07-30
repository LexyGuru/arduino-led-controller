export function unwrapApiPayload(value) {
  let current =
    value;

  for (
    let depth = 0;
    depth < 4;
    depth += 1
  ) {
    if (
      current &&
      typeof current ===
        'object' &&
      current.source &&
      Object.hasOwn(
        current,
        'data'
      )
    ) {
      current =
        current.data;
      continue;
    }

    if (
      current &&
      typeof current ===
        'object' &&
      current.success ===
        true &&
      Object.hasOwn(
        current,
        'data'
      )
    ) {
      current =
        current.data;
      continue;
    }

    break;
  }

  return current;
}

export function readApiError(error) {
  if (!error) {
    return {
      code:
        'UNKNOWN_ERROR',
      message:
        'Ismeretlen hiba történt.'
    };
  }

  const details =
    error.details &&
    typeof error.details ===
      'object'
      ? error.details
      : null;

  return {
    code:
      String(
        error.code ||
        details?.code ||
        'REQUEST_FAILED'
      ),
    message:
      String(
        error.message ||
        details?.message ||
        error
      ),
    status:
      Number(
        error.status ||
        error.statusCode ||
        0
      ) ||
      null,
    details
  };
}

export function asArray(value) {
  const payload =
    unwrapApiPayload(value);

  if (
    Array.isArray(payload)
  ) {
    return payload;
  }

  if (
    Array.isArray(
      payload?.items
    )
  ) {
    return payload.items;
  }

  if (
    Array.isArray(
      payload?.snapshots
    )
  ) {
    return payload.snapshots;
  }

  if (
    Array.isArray(
      payload?.migrations
    )
  ) {
    return payload.migrations;
  }

  return [];
}
