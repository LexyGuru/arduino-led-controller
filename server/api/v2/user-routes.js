'use strict';

const {
  SecurityServiceError
} = require(
  '../../security/security-error'
);

const {
  PERMISSIONS
} = require(
  '../../security/roles'
);

const {
  getRuntimeContext
} = require(
  '../../core/runtime-context'
);

const {
  createPermissionMiddleware
} = require(
  './authorize'
);

const {
  requireApiV2Auth
} = require(
  './auth'
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
  asyncRoute
} = require(
  './routes'
);

function mapUserError(
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
      'USER_SERVICE_ERROR',
      'A felhasználói szolgáltatás hibát jelzett.',
      null,
      {
        cause:
          error
      }
    );
}

function installUserRoutes(
  app
) {
  const read =
    createPermissionMiddleware(
      PERMISSIONS
        .USER_READ
    );

  const admin =
    createPermissionMiddleware(
      PERMISSIONS
        .USER_ADMIN
    );

  app.get(
    '/api/v2/users',
    requireApiV2Auth,
    read,
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
          {
            users:
              await runtime
                .userRepository
                .listUsers()
          }
        );
      }
    )
  );

  app.post(
    '/api/v2/users',
    requireApiV2Auth,
    admin,
    asyncRoute(
      async (
        req,
        res
      ) => {
        const runtime =
          getRuntimeContext();

        try {
          const user =
            await runtime
              .userRepository
              .createUser(
                req.body
              );

          await runtime
            .auditLog
            ?.record?.({
              action:
                'user.create',
              principal:
                req
                  .apiPrincipal,
              request:
                req,
              details: {
                username:
                  user
                    .username,
                role:
                  user.role
              }
            });

          return sendSuccess(
            req,
            res,
            {
              user
            },
            {
              statusCode:
                201
            }
          );
        } catch (error) {
          throw mapUserError(
            error
          );
        }
      }
    )
  );

  app.patch(
    '/api/v2/users/:username',
    requireApiV2Auth,
    admin,
    asyncRoute(
      async (
        req,
        res
      ) => {
        const runtime =
          getRuntimeContext();

        try {
          const user =
            await runtime
              .userRepository
              .updateUser(
                req.params
                  .username,
                req.body
              );

          await runtime
            .auditLog
            ?.record?.({
              action:
                'user.update',
              principal:
                req
                  .apiPrincipal,
              request:
                req,
              details: {
                username:
                  user
                    .username,
                role:
                  user.role,
                enabled:
                  user.enabled
              }
            });

          return sendSuccess(
            req,
            res,
            {
              user
            }
          );
        } catch (error) {
          throw mapUserError(
            error
          );
        }
      }
    )
  );

  app.put(
    '/api/v2/users/:username/password',
    requireApiV2Auth,
    admin,
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
              .userRepository
              .changePassword(
                req.params
                  .username,
                req.body
                  ?.password
              );

          await runtime
            .auditLog
            ?.record?.({
              action:
                'user.password-change',
              principal:
                req
                  .apiPrincipal,
              request:
                req,
              details: {
                username:
                  result
                    .username
              }
            });

          return sendSuccess(
            req,
            res,
            result
          );
        } catch (error) {
          throw mapUserError(
            error
          );
        }
      }
    )
  );

  app.delete(
    '/api/v2/users/:username',
    requireApiV2Auth,
    admin,
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
              .userRepository
              .removeUser(
                req.params
                  .username
              );

          await runtime
            .auditLog
            ?.record?.({
              action:
                'user.remove',
              principal:
                req
                  .apiPrincipal,
              request:
                req,
              details: {
                username:
                  result
                    .username
              }
            });

          return sendSuccess(
            req,
            res,
            result
          );
        } catch (error) {
          throw mapUserError(
            error
          );
        }
      }
    )
  );
}

module.exports = {
  installUserRoutes,
  mapUserError
};
