'use strict';

class SecurityServiceError extends Error {
  constructor(
    statusCode,
    code,
    message,
    details = null,
    options = {}
  ) {
    super(message);

    this.name = 'SecurityServiceError';
    this.statusCode =
      Number.isInteger(statusCode)
        ? statusCode
        : 500;
    this.code =
      String(code || 'SECURITY_SERVICE_ERROR');
    this.details = details;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace?.(
      this,
      SecurityServiceError
    );
  }

  static invalidCredentials() {
    return new SecurityServiceError(
      401,
      'INVALID_CREDENTIALS',
      'Hibás felhasználónév vagy jelszó.'
    );
  }

  static setupRequired() {
    return new SecurityServiceError(
      409,
      'AUTH_SETUP_REQUIRED',
      'Még nincs beállítva felhasználói fiók.'
    );
  }

  static userDisabled() {
    return new SecurityServiceError(
      403,
      'USER_DISABLED',
      'A felhasználói fiók le van tiltva.'
    );
  }
}

module.exports = {
  SecurityServiceError
};
