'use strict';

const rateLimit =
  require(
    'express-rate-limit'
  );

const {
  SecurityServiceError
} = require(
  '../../security/security-error'
);

const {
  getRuntimeContext
} = require(
  '../../core/runtime-context'
);

const {
  HttpError
} = require(
  './http-error'
);

const {
  sendSuccess
} = require(
  './http-response'
);

const {
  requireApiV2Auth
} = require(
  './auth'
);

const {
  asyncRoute
} = require(
  './routes'
);

function mapSecurityError(
  error
) {
  if (
    error instanceof
    HttpError
  ) {
    return error;
  }

  if (
    error instanceof
    SecurityServiceError
  ) {
    return new HttpError(
      error.statusCode,
      error.code,
      error.message,
      error.details,
      {
        cause:
          error
      }
    );
  }

  return HttpError
    .internal(
      'AUTH_SERVICE_ERROR',
      'A hitelesítési szolgáltatás hibát jelzett.',
      null,
      {
        cause:
          error
      }
    );
}

function installSessionRoutes(
  app
) {
  const loginLimiter =
    rateLimit({
      windowMs:
        15 * 60 * 1000,
      max:
        20,
      standardHeaders:
        true,
      legacyHeaders:
        false,
      message: {
        success:
          false,
        error: {
          code:
            'AUTH_RATE_LIMITED',
          message:
            'Túl sok bejelentkezési kísérlet. Próbáld újra később.',
          details:
            null
        }
      }
    });

  app.get(
    '/api/v2/auth/status',
    asyncRoute(
      async (
        req,
        res
      ) => {
        const runtime =
          getRuntimeContext();

        return sendSuccess(
          req,
          res,
          await runtime
            .sessionService
            .status(
              req
            )
        );
      }
    )
  );

  app.post(
    '/api/v2/auth/login',
    loginLimiter,
    asyncRoute(
      async (
        req,
        res
      ) => {
        const runtime =
          getRuntimeContext();

        try {
          const result =
            await runtime
              .sessionService
              .login(
                res,
                req.body
                  ?.username,
                req.body
                  ?.password
              );

          await runtime
            .auditLog
            ?.record?.({
              action:
                'auth.login',
              principal:
                result.principal,
              request:
                req,
              details: {
                username:
                  result.user
                    .username
              }
            });

          return sendSuccess(
            req,
            res,
            result
          );
        } catch (error) {
          await runtime
            .auditLog
            ?.record?.({
              action:
                'auth.login-failed',
              request:
                req,
              details: {
                username:
                  req.body
                    ?.username,
                code:
                  error.code ||
                  'AUTH_SERVICE_ERROR'
              }
            });

          throw mapSecurityError(
            error
          );
        }
      }
    )
  );

  app.get(
    '/api/v2/auth/csrf',
    requireApiV2Auth,
    asyncRoute(
      async (
        req,
        res
      ) => {
        const runtime =
          getRuntimeContext();

        if (
          req
            .apiPrincipal
            ?.type !==
          'user-session'
        ) {
          return sendSuccess(
            req,
            res,
            {
              required:
                false,
              token:
                null
            }
          );
        }

        const token =
          await runtime
            .sessionService
            .csrfTokenForRequest(
              req
            );

        if (!token) {
          throw HttpError
            .unauthorized(
              'SESSION_INVALID',
              'A munkamenet nem érvényes.'
            );
        }

        return sendSuccess(
          req,
          res,
          {
            required:
              true,
            token
          }
        );
      }
    )
  );

  app.post(
    '/api/v2/auth/logout',
    requireApiV2Auth,
    asyncRoute(
      async (
        req,
        res
      ) => {
        const runtime =
          getRuntimeContext();

        const user =
          await runtime
            .sessionService
            .sessionUser(
              req
            );

        runtime
          .sessionService
          .logout(
            res,
            user
          );

        await runtime
          .auditLog
          ?.record?.({
            action:
              'auth.logout',
            principal:
              req
                .apiPrincipal,
            request:
              req
          });

        return sendSuccess(
          req,
          res,
          {
            authenticated:
              false
          }
        );
      }
    )
  );
}

module.exports = {
  installSessionRoutes,
  mapSecurityError
};
