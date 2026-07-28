'use strict';

const crypto = require('crypto');

const {
  isConfiguredSecret
} = require('../../core/config');

const {
  getRuntimeContext
} = require('../../core/runtime-context');

const {
  createPrincipal,
  normalizeRole
} = require('../../security/roles');

const {
  HttpError
} = require('./http-error');

const {
  sendError
} = require('./http-response');

function parseBearerToken(req) {
  const authorization = String(
    req.get?.('Authorization') ||
    req.headers?.authorization ||
    ''
  ).trim();

  const match = authorization.match(
    /^Bearer[ \t]+(.+)$/i
  );

  return match
    ? match[1].trim()
    : '';
}

function safeTokenEquals(
  received,
  expected
) {
  const receivedBuffer =
    Buffer.from(
      String(received || ''),
      'utf8'
    );

  const expectedBuffer =
    Buffer.from(
      String(expected || ''),
      'utf8'
    );

  if (
    receivedBuffer.length !==
    expectedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    receivedBuffer,
    expectedBuffer
  );
}

function createApiV2AuthMiddleware({
  runtimeProvider = getRuntimeContext,
  errorSender = sendError
} = {}) {
  return function requireApiV2Auth(
    req,
    res,
    next
  ) {
    const runtime =
      runtimeProvider();

    const expectedToken =
      runtime.config.apiV2.token;

    if (
      !isConfiguredSecret(
        expectedToken,
        32
      )
    ) {
      return errorSender(
        req,
        res,
        HttpError.serviceUnavailable(
          'API_V2_AUTH_NOT_CONFIGURED',
          'Az API v2 hitelesítése nincs beállítva.'
        )
      );
    }

    const receivedToken =
      parseBearerToken(req);

    if (
      !receivedToken ||
      !safeTokenEquals(
        receivedToken,
        expectedToken
      )
    ) {
      res.set(
        'WWW-Authenticate',
        'Bearer realm="arduino-led-controller-api-v2"'
      );

      return errorSender(
        req,
        res,
        HttpError.unauthorized()
      );
    }

    req.apiPrincipal =
      createPrincipal({
        subject:
          'api-v2-token',
        role:
          normalizeRole(
            runtime.config.apiV2.role
          )
      });

    return next();
  };
}

const requireApiV2Auth =
  createApiV2AuthMiddleware();

module.exports = {
  createApiV2AuthMiddleware,
  parseBearerToken,
  requireApiV2Auth,
  safeTokenEquals
};
