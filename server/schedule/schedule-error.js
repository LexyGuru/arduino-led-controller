'use strict';

class ScheduleValidationError extends Error {
  constructor(
    code,
    message,
    details = null
  ) {
    super(message);

    this.name = 'ScheduleValidationError';
    this.code = String(
      code || 'SCHEDULE_VALIDATION_ERROR'
    );
    this.statusCode = 400;
    this.details = details;

    Error.captureStackTrace?.(
      this,
      ScheduleValidationError
    );
  }
}

class ScheduleServiceError extends Error {
  constructor(
    statusCode,
    code,
    message,
    details = null,
    options = {}
  ) {
    super(message);

    this.name = 'ScheduleServiceError';
    this.statusCode =
      Number.isInteger(statusCode)
        ? statusCode
        : 500;
    this.code = String(
      code || 'SCHEDULE_SERVICE_ERROR'
    );
    this.details = details;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace?.(
      this,
      ScheduleServiceError
    );
  }

  static syncMismatch(
    expected,
    received
  ) {
    return new ScheduleServiceError(
      502,
      'SCHEDULE_SYNC_MISMATCH',
      'Az Arduino nem mentette el az összes időzítést.',
      {
        expected,
        received
      }
    );
  }
}

module.exports = {
  ScheduleServiceError,
  ScheduleValidationError
};
