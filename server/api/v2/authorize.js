'use strict';

const {
  hasPermission
} = require('../../security/roles');

const {
  HttpError
} = require('./http-error');

const {
  sendError
} = require('./http-response');

function createPermissionMiddleware(
  permission,
  {
    errorSender = sendError
  } = {}
) {
  const requiredPermission =
    String(permission || '').trim();

  if (!requiredPermission) {
    throw new TypeError(
      'A szükséges jogosultság megadása kötelező.'
    );
  }

  return function requirePermission(
    req,
    res,
    next
  ) {
    const principal =
      req.apiPrincipal;

    if (!principal) {
      return errorSender(
        req,
        res,
        HttpError.unauthorized()
      );
    }

    if (
      !hasPermission(
        principal.role,
        requiredPermission
      )
    ) {
      return errorSender(
        req,
        res,
        HttpError.forbidden(
          'PERMISSION_REQUIRED',
          'Ehhez a művelethez nincs megfelelő jogosultság.',
          {
            role:
              principal.role,
            permission:
              requiredPermission
          }
        )
      );
    }

    return next();
  };
}

module.exports = {
  createPermissionMiddleware
};
