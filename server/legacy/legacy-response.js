'use strict';

function legacyErrorStatus(
  error,
  fallback = 500
) {
  const status =
    Number(error?.statusCode);

  return (
    Number.isInteger(status) &&
    status >= 400 &&
    status <= 599
  )
    ? status
    : fallback;
}

function sendLegacyError(
  res,
  error,
  {
    fallbackMessage =
      'Belső szerverhiba történt.',
    fallbackCode =
      'INTERNAL_ERROR',
    fallbackStatus = 500,
    timestamp = false
  } = {}
) {
  const payload = {
    error:
      String(
        error?.message ||
        fallbackMessage
      ),
    code:
      String(
        error?.code ||
        fallbackCode
      )
  };

  if (
    error?.details !==
    undefined &&
    error?.details !== null
  ) {
    payload.details =
      error.details;
  }

  if (timestamp) {
    payload.timestamp =
      new Date()
        .toISOString();
  }

  return res
    .status(
      legacyErrorStatus(
        error,
        fallbackStatus
      )
    )
    .json(payload);
}

function unwrapArduinoResult(
  result
) {
  if (
    result &&
    Object.prototype
      .hasOwnProperty
      .call(
        result,
        'arduino'
      )
  ) {
    return result.arduino;
  }

  return result;
}

module.exports = {
  legacyErrorStatus,
  sendLegacyError,
  unwrapArduinoResult
};
