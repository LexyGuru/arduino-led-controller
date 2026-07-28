'use strict';

const {
  getRuntimeContext
} = require('../../core/runtime-context');

const {
  setApiResponseHeaders
} = require('./http-response');

function resolveAllowedOrigin(
  requestOrigin,
  allowedOrigins
) {
  const normalizedRequestOrigin =
    String(requestOrigin || '').trim();

  const normalizedAllowedOrigins =
    Array.isArray(allowedOrigins) &&
    allowedOrigins.length
      ? allowedOrigins
      : ['*'];

  if (
    normalizedAllowedOrigins
      .includes('*')
  ) {
    return '*';
  }

  if (
    normalizedRequestOrigin &&
    normalizedAllowedOrigins.includes(
      normalizedRequestOrigin
    )
  ) {
    return normalizedRequestOrigin;
  }

  return '';
}

function createApiV2CorsMiddleware({
  runtimeProvider = getRuntimeContext
} = {}) {
  return function apiV2CorsAndSecurity(
    req,
    res,
    next
  ) {
    const runtime =
      runtimeProvider();

    const requestOrigin = String(
      req.get?.('Origin') ||
      req.headers?.origin ||
      ''
    ).trim();

    const allowedOrigin =
      resolveAllowedOrigin(
        requestOrigin,
        runtime.config.apiV2
          .allowedOrigins
      );

    if (allowedOrigin) {
      res.set(
        'Access-Control-Allow-Origin',
        allowedOrigin
      );
    }

    if (allowedOrigin !== '*') {
      res.vary('Origin');
    }

    res.set({
      'Access-Control-Allow-Methods':
        'GET, OPTIONS',
      'Access-Control-Allow-Headers':
        'Authorization, Content-Type, X-Request-ID',
      'Access-Control-Expose-Headers':
        'X-Request-ID',
      'Access-Control-Max-Age':
        '600'
    });

    setApiResponseHeaders(res);

    return next();
  };
}

function apiV2OptionsHandler(
  req,
  res
) {
  return res.status(204).end();
}

const apiV2CorsAndSecurity =
  createApiV2CorsMiddleware();

module.exports = {
  apiV2CorsAndSecurity,
  apiV2OptionsHandler,
  createApiV2CorsMiddleware,
  resolveAllowedOrigin
};
