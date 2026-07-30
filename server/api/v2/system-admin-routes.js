'use strict';

const {
  PERMISSIONS
} = require('../../security/roles');

const {
  SystemServiceError
} = require('../../system/system-error');

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

function mapSystemError(error) {
  if (error instanceof HttpError) {
    return error;
  }

  if (
    error instanceof
    SystemServiceError
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
    'SYSTEM_SERVICE_ERROR',
    'A rendszer-adminisztrációs szolgáltatás hibát jelzett.',
    null,
    {
      cause: error
    }
  );
}

function invoke(method, options = {}) {
  return asyncRoute(
    async (req, res) => {
      const runtime =
        getRuntimeContext();

      try {
        const result =
          await method(
            runtime,
            req
          );

        return sendSuccess(
          req,
          res,
          result,
          options
        );
      } catch (error) {
        throw mapSystemError(
          error
        );
      }
    }
  );
}

function installSystemAdminRoutes(
  app
) {
  const releaseRead =
    createPermissionMiddleware(
      PERMISSIONS.RELEASE_READ
    );

  const preflightRead =
    createPermissionMiddleware(
      PERMISSIONS.PREFLIGHT_READ
    );

  const maintenanceAdmin =
    createPermissionMiddleware(
      PERMISSIONS.MAINTENANCE_ADMIN
    );

  const snapshotRead =
    createPermissionMiddleware(
      PERMISSIONS.SNAPSHOT_READ
    );

  const snapshotAdmin =
    createPermissionMiddleware(
      PERMISSIONS.SNAPSHOT_ADMIN
    );

  const migrationRead =
    createPermissionMiddleware(
      PERMISSIONS.MIGRATION_READ
    );

  const migrationAdmin =
    createPermissionMiddleware(
      PERMISSIONS.MIGRATION_ADMIN
    );

  app.get(
    '/api/v2/system/release',
    requireApiV2Auth,
    releaseRead,
    invoke(
      (runtime) =>
        runtime.releaseInfoService
          .getInfo()
    )
  );

  app.get(
    '/api/v2/system/preflight',
    requireApiV2Auth,
    preflightRead,
    invoke(
      (runtime) =>
        runtime.configPreflightService
          .run()
    )
  );

  app.get(
    '/api/v2/system/maintenance',
    requireApiV2Auth,
    releaseRead,
    invoke(
      (runtime) =>
        runtime.maintenanceService
          .getStatus()
    )
  );

  app.put(
    '/api/v2/system/maintenance',
    requireApiV2Auth,
    maintenanceAdmin,
    invoke(
      (runtime, req) =>
        runtime.maintenanceService
          .enable({
            reason:
              req.body?.reason,
            principal:
              req.apiPrincipal
          })
    )
  );

  app.delete(
    '/api/v2/system/maintenance',
    requireApiV2Auth,
    maintenanceAdmin,
    invoke(
      (runtime, req) =>
        runtime.maintenanceService
          .disable({
            principal:
              req.apiPrincipal
          })
    )
  );

  app.get(
    '/api/v2/system/snapshots',
    requireApiV2Auth,
    snapshotRead,
    invoke(
      (runtime) =>
        runtime.snapshotService
          .list()
    )
  );

  app.post(
    '/api/v2/system/snapshots',
    requireApiV2Auth,
    snapshotAdmin,
    invoke(
      (runtime, req) =>
        runtime.snapshotService
          .create({
            label:
              req.body?.label,
            principal:
              req.apiPrincipal
          }),
      {
        statusCode: 201
      }
    )
  );

  app.get(
    '/api/v2/system/snapshots/:id/verify',
    requireApiV2Auth,
    snapshotRead,
    invoke(
      (runtime, req) =>
        runtime.snapshotService
          .verify(
            req.params.id
          )
    )
  );

  app.post(
    '/api/v2/system/snapshots/:id/actions/restore',
    requireApiV2Auth,
    snapshotAdmin,
    invoke(
      (runtime, req) =>
        runtime.snapshotService
          .restore(
            req.params.id,
            {
              confirm:
                req.body?.confirm,
              maintenanceService:
                runtime
                  .maintenanceService,
              principal:
                req.apiPrincipal
            }
          )
    )
  );

  app.delete(
    '/api/v2/system/snapshots/:id',
    requireApiV2Auth,
    snapshotAdmin,
    invoke(
      (runtime, req) =>
        runtime.snapshotService
          .remove(
            req.params.id
          )
    )
  );

  app.get(
    '/api/v2/system/migrations',
    requireApiV2Auth,
    migrationRead,
    invoke(
      (runtime) =>
        runtime.migrationService
          .status()
    )
  );

  app.post(
    '/api/v2/system/migrations/actions/dry-run',
    requireApiV2Auth,
    migrationRead,
    invoke(
      (runtime, req) =>
        runtime.migrationService
          .apply({
            dryRun: true,
            principal:
              req.apiPrincipal
          })
    )
  );

  app.post(
    '/api/v2/system/migrations/actions/apply',
    requireApiV2Auth,
    migrationAdmin,
    invoke(
      (runtime, req) =>
        runtime.migrationService
          .apply({
            dryRun: false,
            principal:
              req.apiPrincipal
          })
    )
  );
}

module.exports = {
  installSystemAdminRoutes,
  mapSystemError
};
