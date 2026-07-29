'use strict';

const {
  ReleaseServiceError
} =
  require(
    '../../release/release-error'
  );

const {
  PERMISSIONS
} =
  require(
    '../../security/roles'
  );

const {
  getRuntimeContext
} =
  require(
    '../../core/runtime-context'
  );

const {
  createPermissionMiddleware
} =
  require(
    './authorize'
  );

const {
  requireApiV2Auth
} =
  require(
    './auth'
  );

const {
  HttpError
} =
  require(
    './http-error'
  );

const {
  sendSuccess
} =
  require(
    './http-response'
  );

const {
  asyncRoute
} =
  require(
    './routes'
  );

function mapReleaseError(
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
    ReleaseServiceError
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
      'RELEASE_SERVICE_ERROR',
      'A release szolgáltatás hibát jelzett.',
      null,
      {
        cause:
          error
      }
    );
}

function invoke(
  method,
  {
    statusCode = 200
  } = {}
) {
  return asyncRoute(
    async (
      req,
      res
    ) => {
      const runtime =
        getRuntimeContext();

      try {
        return sendSuccess(
          req,
          res,
          await method(
            runtime
              .releaseGateService,
            req
          ),
          {
            statusCode
          }
        );
      } catch (error) {
        throw mapReleaseError(
          error
        );
      }
    }
  );
}


function invokeFinalization(
  method,
  {
    statusCode = 200
  } = {}
) {
  return asyncRoute(
    async (
      req,
      res
    ) => {
      const runtime =
        getRuntimeContext();

      try {
        return sendSuccess(
          req,
          res,
          await method(
            runtime
              .releaseFinalizationService,
            req
          ),
          {
            statusCode
          }
        );
      } catch (error) {
        throw mapReleaseError(
          error
        );
      }
    }
  );
}

function installReleaseRoutes(
  app
) {
  const read =
    createPermissionMiddleware(
      PERMISSIONS
        .RELEASE_READ
    );

  const admin =
    createPermissionMiddleware(
      PERMISSIONS
        .RELEASE_ADMIN
    );


app.get(
  '/api/v2/release/execution-receipts',
  requireApiV2Auth,
  read,
  invokeFinalization(
    (service) =>
      service.receipts()
  )
);

app.get(
  '/api/v2/release/finalization-readiness',
  requireApiV2Auth,
  read,
  invokeFinalization(
    (service) =>
      service.readiness()
  )
);

app.post(
  '/api/v2/release/actions/verify-finalization',
  requireApiV2Auth,
  admin,
  invokeFinalization(
    (service) =>
      service.verify()
  )
);

app.post(
  '/api/v2/release/actions/approve-finalization',
  requireApiV2Auth,
  admin,
  invokeFinalization(
    (
      service,
      req
    ) =>
      service.approve({
        confirm:
          req.body?.confirm,
        principal:
          req.apiPrincipal
      }),
    {
      statusCode: 201
    }
  )
);

app.delete(
  '/api/v2/release/finalization-approval',
  requireApiV2Auth,
  admin,
  invokeFinalization(
    (
      service,
      req
    ) =>
      service.revoke({
        principal:
          req.apiPrincipal
      })
  )
);

  app.get(
    '/api/v2/release/status',
    requireApiV2Auth,
    read,
    invoke(
      (service) =>
        service.status()
    )
  );

  app.get(
    '/api/v2/release/metadata',
    requireApiV2Auth,
    read,
    invoke(
      (service) =>
        service
          .installedMetadata()
    )
  );

  app.get(
    '/api/v2/release/promotion-readiness',
    requireApiV2Auth,
    read,
    invoke(
      (service) =>
        service.readiness()
    )
  );

  app.post(
    '/api/v2/release/actions/verify-gate',
    requireApiV2Auth,
    admin,
    invoke(
      (service) =>
        service.verify()
    )
  );

  app.post(
    '/api/v2/release/actions/approve-promotion',
    requireApiV2Auth,
    admin,
    invoke(
      (
        service,
        req
      ) =>
        service.approve({
          confirm:
            req.body?.confirm,
          principal:
            req.apiPrincipal
        }),
      {
        statusCode: 201
      }
    )
  );

  app.delete(
    '/api/v2/release/promotion-approval',
    requireApiV2Auth,
    admin,
    invoke(
      (
        service,
        req
      ) =>
        service.revoke({
          principal:
            req.apiPrincipal
        })
    )
  );
}

module.exports = {
  installReleaseRoutes,
  mapReleaseError
};
