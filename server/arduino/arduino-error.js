'use strict';

class ArduinoClientError extends Error {
  constructor(
    code,
    message,
    {
      statusCode = 503,
      upstreamStatus = null,
      details = null,
      cause = null
    } = {}
  ) {
    super(message);

    this.name = 'ArduinoClientError';
    this.code = String(
      code || 'ARDUINO_ERROR'
    );

    this.statusCode =
      Number.isInteger(statusCode)
        ? statusCode
        : 503;

    this.upstreamStatus =
      Number.isInteger(upstreamStatus)
        ? upstreamStatus
        : null;

    this.details = details ?? null;

    if (cause) {
      this.cause = cause;
    }

    Error.captureStackTrace?.(
      this,
      ArduinoClientError
    );
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      upstreamStatus:
        this.upstreamStatus,
      details: this.details
    };
  }

  static configuration(details = null) {
    return new ArduinoClientError(
      'ARDUINO_CONFIG_INVALID',
      'Az Arduino-kapcsolat konfigurációja hiányos.',
      {
        statusCode: 503,
        details
      }
    );
  }

  static timeout(cause = null) {
    return new ArduinoClientError(
      'ARDUINO_TIMEOUT',
      'Az Arduino nem válaszolt a megadott időkorláton belül.',
      {
        statusCode: 504,
        cause
      }
    );
  }

  static authentication(
    upstreamStatus,
    cause = null
  ) {
    return new ArduinoClientError(
      'ARDUINO_AUTH_FAILED',
      'Az Arduino elutasította a szerver hitelesítését.',
      {
        statusCode: 502,
        upstreamStatus,
        cause
      }
    );
  }

  static badResponse(
    upstreamStatus,
    cause = null
  ) {
    return new ArduinoClientError(
      'ARDUINO_BAD_RESPONSE',
      'Az Arduino hibás HTTP-választ adott.',
      {
        statusCode: 502,
        upstreamStatus,
        cause
      }
    );
  }

  static unreachable(cause = null) {
    return new ArduinoClientError(
      'ARDUINO_UNREACHABLE',
      'Az Arduino jelenleg nem érhető el.',
      {
        statusCode: 503,
        cause
      }
    );
  }
}

module.exports = {
  ArduinoClientError
};
