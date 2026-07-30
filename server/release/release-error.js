'use strict';

class ReleaseServiceError extends Error {
  constructor(
    statusCode,
    code,
    message,
    details = null,
    options = {}
  ) {
    super(message);

    this.name = 'ReleaseServiceError';
    this.statusCode =
      Number.isInteger(statusCode)
        ? statusCode
        : 500;
    this.code =
      String(
        code ||
        'RELEASE_SERVICE_ERROR'
      );
    this.details = details;

    if (options.cause) {
      this.cause =
        options.cause;
    }

    Error.captureStackTrace?.(
      this,
      ReleaseServiceError
    );
  }

  static gateNotFound(
    directory
  ) {
    return new ReleaseServiceError(
      404,
      'RELEASE_GATE_REPORT_NOT_FOUND',
      'Nem található alpha.2 LXC release-gate jelentés.',
      {
        directory
      }
    );
  }

  static gateRejected(
    validation
  ) {
    return new ReleaseServiceError(
      409,
      'RELEASE_GATE_REJECTED',
      'Az alpha.2 release-gate jelentés nem fogadható el.',
      validation
    );
  }

  static readinessRejected(
    readiness
  ) {
    return new ReleaseServiceError(
      409,
      'ALPHA2_PROMOTION_NOT_READY',
      'Az alpha.2 promóció előfeltételei nem teljesülnek.',
      readiness
    );
  }

  static confirmationRequired() {
    return new ReleaseServiceError(
      400,
      'PROMOTION_CONFIRMATION_REQUIRED',
      'A promóció jóváhagyásához pontos megerősítés szükséges.',
      {
        expected:
          'APPROVE_ALPHA2_PROMOTION'
      }
    );
  }

  static approvalNotFound(
    file
  ) {
    return new ReleaseServiceError(
      404,
      'PROMOTION_APPROVAL_NOT_FOUND',
      'Nem található alpha.2 promóciós jóváhagyás.',
      {
        file
      }
    );
  }
}

module.exports = {
  ReleaseServiceError
};
