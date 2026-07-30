'use strict';

const {
  SecurityServiceError
} = require('../../security/security-error');

const {
  PERMISSIONS
} = require('../../security/roles');

const {
  getRuntimeContext
} = require('../../core/runtime-context');

const {
  createPermissionMiddleware
} = require('./authorize');

const {
  requireApiV2Auth
} = require('./auth');

const {
  HttpError
} = require('./http-error');

const {
  sendSuccess
} = require('./http-response');

const {
  asyncRoute
} = require('./routes');

function mapTokenError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  if (error instanceof SecurityServiceError) {
    return new HttpError(
      error.statusCode,
      error.code,
      error.message,
      error.details,
      { cause: error }
    );
  }

  return HttpError.internal(
    'API_TOKEN_SERVICE_ERROR',
    'Az API-token szolgáltatás hibát jelzett.',
    null,
    { cause: error }
  );
}

function actorFromRequest(req) {
  return req.apiPrincipal
    ? {
        subject: req.apiPrincipal.subject,
        type: req.apiPrincipal.type,
        role: req.apiPrincipal.role
      }
    : null;
}

function invoke(method, options = {}) {
  return asyncRoute(async (req, res) => {
    const runtime = getRuntimeContext();

    try {
      const result = await method(
        runtime.apiTokenService,
        req
      );

      return sendSuccess(
        req,
        res,
        result,
        options
      );
    } catch (error) {
      throw mapTokenError(error);
    }
  });
}

function installTokenRoutes(app) {
  const read = createPermissionMiddleware(
    PERMISSIONS.TOKEN_READ
  );

  const admin = createPermissionMiddleware(
    PERMISSIONS.TOKEN_ADMIN
  );

  app.get(
    '/api/v2/tokens',
    requireApiV2Auth,
    read,
    invoke((service) => ({
      managed: service.list(),
      configured:
        getRuntimeContext()
          .apiTokenStore
          .publicSummary()
    }))
  );

  app.post(
    '/api/v2/tokens',
    requireApiV2Auth,
    admin,
    invoke(
      (service, req) => service.create(
        req.body,
        { actor: actorFromRequest(req) }
      ),
      { statusCode: 201 }
    )
  );

  app.patch(
    '/api/v2/tokens/:id',
    requireApiV2Auth,
    admin,
    invoke((service, req) => service.update(
      req.params.id,
      req.body,
      { actor: actorFromRequest(req) }
    ))
  );

  app.post(
    '/api/v2/tokens/:id/actions/rotate',
    requireApiV2Auth,
    admin,
    invoke((service, req) => service.rotate(
      req.params.id,
      req.body,
      { actor: actorFromRequest(req) }
    ))
  );

  app.delete(
    '/api/v2/tokens/:id',
    requireApiV2Auth,
    admin,
    invoke((service, req) => service.remove(
      req.params.id,
      { actor: actorFromRequest(req) }
    ))
  );
}

module.exports = {
  actorFromRequest,
  installTokenRoutes,
  mapTokenError
};
