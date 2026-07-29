'use strict';

const {
  getRuntimeContext
} = require(
  '../../core/runtime-context'
);

const {
  renderPrometheus
} = require(
  '../../observability/prometheus-exporter'
);

const {
  PERMISSIONS
} = require(
  '../../security/roles'
);

const {
  createPermissionMiddleware
} = require('./authorize');

const {
  requireApiV2Auth
} = require('./auth');

function installPrometheusRoutes(
  app
) {
  const metricsRead =
    createPermissionMiddleware(
      PERMISSIONS
        .METRICS_READ
    );

  app.get(
    '/api/v2/metrics/prometheus',
    requireApiV2Auth,
    metricsRead,
    (req, res) => {
      const runtime =
        getRuntimeContext();

      res.set({
        'Content-Type':
          'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control':
          'no-store'
      });

      return res.status(200)
        .send(
          renderPrometheus(
            runtime.metrics
              .snapshot()
          )
        );
    }
  );
}

module.exports = {
  installPrometheusRoutes
};
