'use strict';

const rateLimit = require('express-rate-limit');

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
  sendSuccess
} = require('./http-response');

const {
  asyncRoute
} = require('./routes');

function mapSecurityError(error) {
  if (error instanceof HttpError) {
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
        cause: error
      }
    );
  }

  return HttpError.internal(
    'AUTH_SERVICE_ERROR',
    'A hitelesítési szolgáltatás hibát jelzett.',
    null,
    {
      cause: error
    }
  );
}

function installSessionRoutes(app) {
  const loginLimiter =
    rateLimit({
      windowMs:
        15 * 60 * 1000,
      max: 20,
      standardHeaders: true,
      legacyHeaders: false,
      message: {
        success: false,
        error: {
          code:
            'AUTH_RATE_LIMITED',
          message:
            'Túl sok bejelentkezési kísérlet. Próbáld újra később.',
          details: null
        }
      }
    });

  app.get(
    '/api/v2/auth/status',
    asyncRoute(
      async (req, res) => {
        const runtime =
          getRuntimeContext();

        return sendSuccess(
          req,
          res,
          await runtime
            .sessionService
            .status(req)
        );
      }
    )
  );

  app.post(
    '/api/v2/auth/login',
    loginLimiter,
    asyncRoute(
      async (req, res) => {
        const runtime =
          getRuntimeContext();

        try {
          return sendSuccess(
            req,
            res,
            await runtime
              .sessionService
              .login(
                res,
                req.body?.username,
                req.body?.password
              )
          );
        } catch (error) {
          throw mapSecurityError(
            error
          );
        }
      }
    )
  );

  app.post(
    '/api/v2/auth/logout',
    asyncRoute(
      async (req, res) => {
        const runtime =
          getRuntimeContext();

        const user =
          await runtime
            .sessionService
            .sessionUser(req);

        runtime
          .sessionService
          .logout(
            res,
            user
          );

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
