'use strict';

const {
  ArduinoClientError
} = require('../../arduino/arduino-error');

const {
  HttpError
} = require('./http-error');

function mapArduinoClientError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  if (
    error instanceof
    ArduinoClientError
  ) {
    const details =
      error.details ||
      (
        error.upstreamStatus
          ? {
              upstreamStatus:
                error.upstreamStatus
            }
          : null
      );

    return new HttpError(
      error.statusCode,
      error.code,
      error.message,
      details,
      {
        cause: error
      }
    );
  }

  return HttpError.serviceUnavailable(
    'ARDUINO_UNREACHABLE',
    'Az Arduino jelenleg nem érhető el.',
    null,
    {
      cause: error
    }
  );
}

module.exports = {
  mapArduinoClientError
};
