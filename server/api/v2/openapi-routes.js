'use strict';

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

function installOpenApiRoutes(
  app
) {
  app.get(
    '/api/v2/openapi.json',
    asyncRoute(
      async (
        req,
        res
      ) => {
        const runtime =
          getRuntimeContext();

        res.set({
          'Cache-Control':
            'public, max-age=300',
          'Content-Type':
            'application/json; charset=utf-8'
        });

        return res
          .status(200)
          .json(
            await runtime
              .openApiService
              .getDocument()
          );
      }
    )
  );

  app.get(
    '/api/v2/docs',
    (
      req,
      res
    ) => {
      const runtime =
        getRuntimeContext();

      res.set({
        'Cache-Control':
          'public, max-age=300',
        'Content-Type':
          'text/html; charset=utf-8'
      });

      return res
        .status(200)
        .send(
          runtime
            .openApiService
            .docsHtml()
        );
    }
  );

  app.get(
    '/api/v2/openapi/status',
    asyncRoute(
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
            await runtime
              .openApiService
              .summary()
          );
        } catch (error) {
          throw HttpError
            .internal(
              'OPENAPI_DOCUMENT_INVALID',
              'Az OpenAPI dokumentum nem tölthető be.',
              null,
              {
                cause:
                  error
              }
            );
        }
      }
    )
  );
}

module.exports = {
  installOpenApiRoutes
};
