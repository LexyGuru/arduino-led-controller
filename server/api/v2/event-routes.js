'use strict';

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
  sendSuccess
} = require('./http-response');

const {
  HttpError
} = require('./http-error');

function installEventRoutes(app) {
  const systemRead =
    createPermissionMiddleware(
      PERMISSIONS.SYSTEM_READ
    );

  app.get(
    '/api/v2/events/status',
    requireApiV2Auth,
    systemRead,
    (req, res) => {
      const runtime =
        getRuntimeContext();

      return sendSuccess(
        req,
        res,
        {
          eventBus:
            runtime.eventBus
              .stats(),
          socket:
            runtime.socketGateway
              .getStatus()
        }
      );
    }
  );

  app.get(
    '/api/v2/events/recent',
    requireApiV2Auth,
    systemRead,
    (req, res) => {
      const runtime =
        getRuntimeContext();

      let events;

      try {
        events =
          runtime.eventBus
            .recent({
              limit:
                req.query?.limit,
              topic:
                req.query?.topic
            });
      } catch (error) {
        throw HttpError.badRequest(
          'INVALID_EVENT_QUERY',
          error.message
        );
      }

      return sendSuccess(
        req,
        res,
        {
          events,
          stats:
            runtime.eventBus
              .stats()
        }
      );
    }
  );
}

module.exports = {
  installEventRoutes
};
