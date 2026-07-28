'use strict';

class HttpError extends Error {
  constructor(
    statusCode,
    code,
    message,
    details = null,
    options = {}
  ) {
    super(message);

    this.name = 'HttpError';
    this.statusCode = Number.isInteger(statusCode)
      ? statusCode
      : 500;
    this.code = String(code || 'INTERNAL_ERROR');
    this.details = details ?? null;
    this.expose = options.expose !== false;

    if (options.cause) {
      this.cause = options.cause;
    }

    Error.captureStackTrace?.(this, HttpError);
  }

  static badRequest(
    code = 'BAD_REQUEST',
    message = 'A kérés érvénytelen.',
    details = null
  ) {
    return new HttpError(400, code, message, details);
  }

  static unauthorized(
    code = 'UNAUTHORIZED',
    message = 'A végpont használatához érvényes hitelesítés szükséges.',
    details = null
  ) {
    return new HttpError(401, code, message, details);
  }

  static forbidden(
    code = 'FORBIDDEN',
    message = 'Ehhez a művelethez nincs jogosultság.',
    details = null
  ) {
    return new HttpError(403, code, message, details);
  }

  static notFound(
    code = 'NOT_FOUND',
    message = 'A kért erőforrás nem található.',
    details = null
  ) {
    return new HttpError(404, code, message, details);
  }

  static conflict(
    code = 'CONFLICT',
    message = 'A kérés ütközik a jelenlegi állapottal.',
    details = null
  ) {
    return new HttpError(409, code, message, details);
  }

  static serviceUnavailable(
    code = 'SERVICE_UNAVAILABLE',
    message = 'A szolgáltatás átmenetileg nem érhető el.',
    details = null,
    options = {}
  ) {
    return new HttpError(
      503,
      code,
      message,
      details,
      options
    );
  }

  static gatewayTimeout(
    code = 'GATEWAY_TIMEOUT',
    message = 'A háttérszolgáltatás nem válaszolt időben.',
    details = null,
    options = {}
  ) {
    return new HttpError(
      504,
      code,
      message,
      details,
      options
    );
  }

  static internal(
    code = 'INTERNAL_ERROR',
    message = 'Belső szerverhiba történt.',
    details = null,
    options = {}
  ) {
    return new HttpError(
      500,
      code,
      message,
      details,
      {
        ...options,
        expose: false
      }
    );
  }
}

module.exports = {
  HttpError
};
