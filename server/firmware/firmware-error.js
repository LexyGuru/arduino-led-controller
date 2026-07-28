'use strict';

class FirmwareServiceError extends Error {
  constructor(
    statusCode,
    code,
    message,
    details = null,
    options = {}
  ) {
    super(message);

    this.name = 'FirmwareServiceError';
    this.statusCode = Number.isInteger(statusCode) ? statusCode : 500;
    this.code = String(code || 'FIRMWARE_SERVICE_ERROR');
    this.details = details;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace?.(this, FirmwareServiceError);
  }

  static busy(state) {
    return new FirmwareServiceError(
      409,
      'FIRMWARE_UPDATE_BUSY',
      'Már folyamatban van firmware-frissítés.',
      { state }
    );
  }

  static notConfigured(details) {
    return new FirmwareServiceError(
      503,
      'OTA_NOT_CONFIGURED',
      'Az OTA frissítés nincs teljesen beállítva.',
      details
    );
  }
}

module.exports = {
  FirmwareServiceError
};
