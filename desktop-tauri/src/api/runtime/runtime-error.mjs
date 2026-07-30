export class DesktopApiRuntimeError extends Error {
  constructor(
    code,
    message,
    details = null,
    options = {}
  ) {
    super(message);

    this.name =
      'DesktopApiRuntimeError';
    this.code =
      String(
        code ||
        'DESKTOP_API_RUNTIME_ERROR'
      );
    this.details =
      details;

    if (options.cause) {
      this.cause =
        options.cause;
    }

    Error.captureStackTrace?.(
      this,
      DesktopApiRuntimeError
    );
  }

  static invalidProfile(
    message,
    details = null
  ) {
    return new DesktopApiRuntimeError(
      'INVALID_SERVER_PROFILE',
      message,
      details
    );
  }

  static offline(
    details = null
  ) {
    return new DesktopApiRuntimeError(
      'OFFLINE_WRITE_BLOCKED',
      'A módosító művelet offline állapotban nem indítható el.',
      details
    );
  }

  static disposed() {
    return new DesktopApiRuntimeError(
      'RUNTIME_DISPOSED',
      'A desktop API runtime már leállt.'
    );
  }
}
