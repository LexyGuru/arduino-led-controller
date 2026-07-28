'use strict';

const {
  ApiTokenStore,
  safeTokenEquals
} = require('../../security/api-token-store');

const {
  getRuntimeContext
} = require('../../core/runtime-context');

const {
  HttpError
} = require('./http-error');

const {
  sendError
} = require('./http-response');

function parseBearerToken(req) {
  const authorization =
    String(
      req.get?.('Authorization') ||
      req.headers?.authorization ||
      ''
    ).trim();

  const match =
    authorization.match(
      /^Bearer[ \t]+(.+)$/i
    );

  return match
    ? match[1].trim()
    : '';
}

function resolveApiTokenStore(runtime) {
  if (
    runtime?.apiTokenStore &&
    typeof runtime.apiTokenStore.authenticate ===
      'function'
  ) {
    return runtime.apiTokenStore;
  }

  return ApiTokenStore.fromConfig(
    runtime?.config?.apiV2 || {}
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

    const tokenStore =
      resolveApiTokenStore(runtime);

    if (!tokenStore.isConfigured()) {
      return errorSender(
        req,
        res,
        HttpError.serviceUnavailable(
          'API_V2_AUTH_NOT_CONFIGURED',
          'Az API v2 hitelesítése nincs beállítva.'
        )
      );
    }

    const principal =
      tokenStore.authenticate(
        parseBearerToken(req)
      );

    if (!principal) {
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

    req.apiPrincipal = principal;
    return next();
  };
}

const requireApiV2Auth =
  createApiV2AuthMiddleware();

module.exports = {
  createApiV2AuthMiddleware,
  parseBearerToken,
  requireApiV2Auth,
  resolveApiTokenStore,
  safeTokenEquals
};
