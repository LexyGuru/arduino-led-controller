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
  asyncRoute
} = require('./routes');

function installObservabilityRoutes(
  app
) {
  const diagnosticsRead =
    createPermissionMiddleware(
      PERMISSIONS
        .DIAGNOSTICS_READ
    );

  const auditRead =
    createPermissionMiddleware(
      PERMISSIONS
        .AUDIT_READ
    );

  app.get(
    '/api/v2/metrics',
    requireApiV2Auth,
    diagnosticsRead,
    (
      req,
      res
    ) => {
      const runtime =
        getRuntimeContext();

      return sendSuccess(
        req,
        res,
        runtime
          .metrics
          .snapshot()
      );
    }
  );

  app.get(
    '/api/v2/diagnostics',
    requireApiV2Auth,
    diagnosticsRead,
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
            .diagnosticsService
            .snapshot()
        );
      }
    )
  );

  app.get(
    '/api/v2/audit/status',
    requireApiV2Auth,
    auditRead,
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
            .auditLog
            .stats()
        );
      }
    )
  );

  app.get(
    '/api/v2/audit/recent',
    requireApiV2Auth,
    auditRead,
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
            entries:
              await runtime
                .auditLog
                .recent(
                  req.query
                    ?.limit
                )
          }
        );
      }
    )
  );
}

module.exports = {
  installObservabilityRoutes
};
