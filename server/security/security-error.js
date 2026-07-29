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

    this.name =
      'SecurityServiceError';
    this.statusCode =
      Number.isInteger(
        statusCode
      )
        ? statusCode
        : 500;
    this.code =
      String(
        code ||
        'SECURITY_SERVICE_ERROR'
      );
    this.details =
      details;

    if (options.cause) {
      this.cause =
        options.cause;
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

  static invalidUsername(details = null) {
    return new SecurityServiceError(
      400,
      'INVALID_USERNAME',
      'A felhasználónév 3–32 karakteres, kisbetűs betűkből, számokból és . _ - jelekből álljon.',
      details
    );
  }

  static invalidPassword(details = null) {
    return new SecurityServiceError(
      400,
      'INVALID_PASSWORD',
      'A jelszó legalább 12 karakter legyen.',
      details
    );
  }

  static invalidRole(details = null) {
    return new SecurityServiceError(
      400,
      'INVALID_ROLE',
      'A szerepkör admin, operator vagy viewer lehet.',
      details
    );
  }

  static userExists(username) {
    return new SecurityServiceError(
      409,
      'USER_ALREADY_EXISTS',
      'Ez a felhasználónév már létezik.',
      {
        username
      }
    );
  }

  static userNotFound(username) {
    return new SecurityServiceError(
      404,
      'USER_NOT_FOUND',
      'A felhasználó nem található.',
      {
        username
      }
    );
  }

  static lastAdmin() {
    return new SecurityServiceError(
      409,
      'LAST_ADMIN_PROTECTED',
      'Az utolsó engedélyezett adminisztrátor nem tiltható le és nem törölhető.'
    );
  }

  static csrfInvalid() {
    return new SecurityServiceError(
      403,
      'CSRF_TOKEN_INVALID',
      'A munkamenet CSRF-tokenje hiányzik vagy érvénytelen.'
    );
  }
}

module.exports = {
  SecurityServiceError
};
