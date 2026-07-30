'use strict';

class FileServiceError extends Error {
  constructor(statusCode, code, message, details = null, options = {}) {
    super(message);
    this.name = 'FileServiceError';
    this.statusCode = Number.isInteger(statusCode) ? statusCode : 500;
    this.code = String(code || 'FILE_SERVICE_ERROR');
    this.details = details;
    if (options.cause) this.cause = options.cause;
    Error.captureStackTrace?.(this, FileServiceError);
  }
}

module.exports = {
  FileServiceError
};
