'use strict';

class SystemServiceError extends Error {
  constructor(
    statusCode,
    code,
    message,
    details = null,
    options = {}
  ) {
    super(message);

    this.name = 'SystemServiceError';
    this.statusCode =
      Number.isInteger(statusCode)
        ? statusCode
        : 500;
    this.code =
      String(code || 'SYSTEM_SERVICE_ERROR');
    this.details = details;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace?.(
      this,
      SystemServiceError
    );
  }

  static notFound(
    code,
    message,
    details = null
  ) {
    return new SystemServiceError(
      404,
      code,
      message,
      details
    );
  }

  static conflict(
    code,
    message,
    details = null
  ) {
    return new SystemServiceError(
      409,
      code,
      message,
      details
    );
  }

  static invalid(
    code,
    message,
    details = null
  ) {
    return new SystemServiceError(
      400,
      code,
      message,
      details
    );
  }
}

module.exports = {
  SystemServiceError
};
