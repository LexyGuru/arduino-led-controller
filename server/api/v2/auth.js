'use strict';

const {
  ApiTokenStore,
  safeTokenEquals
} = require('../../security/api-token-store');

const {
  SecurityServiceError
} = require('../../security/security-error');

const {
  getRuntimeContext
} = require('../../core/runtime-context');

const {
  HttpError
} = require('./http-error');

const {
  sendError
} = require('./http-response');

const SAFE_METHODS =
  Object.freeze([
    'GET',
    'HEAD',
    'OPTIONS'
  ]);

function parseBearerToken(req) {
  const authorization =
    String(
      req.get?.(
        'Authorization'
      ) ||
      req.headers
        ?.authorization ||
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

function resolveApiTokenStore(
  runtime
) {
  if (
    runtime
      ?.apiTokenStore &&
    typeof runtime
      .apiTokenStore
      .authenticate ===
      'function'
  ) {
    return runtime
      .apiTokenStore;
  }

  return ApiTokenStore
    .fromConfig(
      runtime
        ?.config
        ?.apiV2 ||
      {}
    );
}

async function resolvePrincipal(
  runtime,
  req
) {
  const tokenStore =
    resolveApiTokenStore(
      runtime
    );

  const bearer =
    parseBearerToken(req);

  if (
    bearer &&
    tokenStore
      .isConfigured()
  ) {
    const principal =
      tokenStore
        .authenticate(
          bearer
        );

    if (principal) {
      return principal;
    }
  }

  if (
    runtime
      ?.sessionService &&
    typeof runtime
      .sessionService
      .principalForRequest ===
      'function'
  ) {
    return runtime
      .sessionService
      .principalForRequest(
        req
      );
  }

  return null;
}

function requiresCsrf(
  req,
  principal
) {
  return (
    principal
      ?.type ===
      'user-session' &&
    !SAFE_METHODS
      .includes(
        String(
          req.method ||
          'GET'
        ).toUpperCase()
      )
  );
}

function createApiV2AuthMiddleware({
  runtimeProvider =
    getRuntimeContext,
  errorSender =
    sendError
} = {}) {
  return async function requireApiV2Auth(
    req,
    res,
    next
  ) {
    const runtime =
      runtimeProvider();

    const tokenStore =
      resolveApiTokenStore(
        runtime
      );

    const sessionAvailable =
      Boolean(
        runtime
          ?.sessionService
      );

    if (
      !tokenStore
        .isConfigured() &&
      !sessionAvailable
    ) {
      return errorSender(
        req,
        res,
        HttpError
          .serviceUnavailable(
            'API_V2_AUTH_NOT_CONFIGURED',
            'Az API v2 hitelesítése nincs beállítva.'
          )
      );
    }

    const principal =
      await resolvePrincipal(
        runtime,
        req
      );

    if (!principal) {
      res.set(
        'WWW-Authenticate',
        'Bearer realm="arduino-led-controller-api-v2"'
      );

      return errorSender(
        req,
        res,
        HttpError
          .unauthorized()
      );
    }

    if (
      requiresCsrf(
        req,
        principal
      )
    ) {
      const received =
        String(
          req.get?.(
            'X-CSRF-Token'
          ) ||
          req.headers
            ?.['x-csrf-token'] ||
          ''
        ).trim();

      const valid =
        await runtime
          .sessionService
          .verifyCsrfToken(
            req,
            received
          );

      if (!valid) {
        const error =
          SecurityServiceError
            .csrfInvalid();

        return errorSender(
          req,
          res,
          new HttpError(
            error.statusCode,
            error.code,
            error.message,
            error.details
          )
        );
      }
    }

    req.apiPrincipal =
      principal;

    return next();
  };
}

const requireApiV2Auth =
  createApiV2AuthMiddleware();

module.exports = {
  SAFE_METHODS,
  createApiV2AuthMiddleware,
  parseBearerToken,
  requireApiV2Auth,
  requiresCsrf,
  resolveApiTokenStore,
  resolvePrincipal,
  safeTokenEquals
};
