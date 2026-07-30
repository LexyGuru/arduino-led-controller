'use strict';

class LedValidationError extends Error {
  constructor(
    code,
    message,
    details = null
  ) {
    super(message);
    this.name = 'LedValidationError';
    this.code =
      String(code || 'LED_VALIDATION_ERROR');
    this.statusCode = 400;
    this.details = details;
    Error.captureStackTrace?.(
      this,
      LedValidationError
    );
  }
}

class LedServiceError extends Error {
  constructor(
    statusCode,
    code,
    message,
    details = null,
    options = {}
  ) {
    super(message);
    this.name = 'LedServiceError';
    this.statusCode =
      Number.isInteger(statusCode)
        ? statusCode
        : 500;
    this.code =
      String(code || 'LED_SERVICE_ERROR');
    this.details = details;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace?.(
      this,
      LedServiceError
    );
  }

  static notFound(id) {
    return new LedServiceError(
      404,
      'LED_NOT_FOUND',
      'A kért LED-szalag nem található.',
      {
        id
      }
    );
  }
}

module.exports = {
  LedServiceError,
  LedValidationError
};
