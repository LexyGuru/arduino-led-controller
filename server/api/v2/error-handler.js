'use strict';

const {
  HttpError
} = require('./http-error');

const {
  sendError
} = require('./http-response');

function apiV2NotFoundHandler(
  req,
  res
) {
  return sendError(
    req,
    res,
    HttpError.notFound(
      'API_ROUTE_NOT_FOUND',
      'Az API v2 útvonal nem található.',
      {
        method:
          req.method,
        path:
          req.originalUrl
      }
    )
  );
}

function apiV2ErrorHandler(
  error,
  req,
  res,
  next
) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof HttpError) {
    return sendError(
      req,
      res,
      error
    );
  }

  return sendError(
    req,
    res,
    HttpError.internal(
      'INTERNAL_ERROR',
      'Belső szerverhiba történt.',
      null,
      {
        cause: error
      }
    )
  );
}

module.exports = {
  apiV2ErrorHandler,
  apiV2NotFoundHandler
};
