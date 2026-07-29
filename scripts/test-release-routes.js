'use strict';

const assert =
  require('assert');

const {
  installReleaseRoutes,
  mapReleaseError
} =
  require(
    '../server/api/v2/release-routes'
  );

const {
  ReleaseServiceError
} =
  require(
    '../server/release/release-error'
  );

function main() {
  const registered = [];

  const app = {
    get(
      route,
      ...handlers
    ) {
      registered.push({
        method: 'GET',
        route,
        handlers
      });
    },

    post(
      route,
      ...handlers
    ) {
      registered.push({
        method: 'POST',
        route,
        handlers
      });
    },

    delete(
      route,
      ...handlers
    ) {
      registered.push({
        method: 'DELETE',
        route,
        handlers
      });
    }
  };

  installReleaseRoutes(
    app
  );

  assert.strictEqual(
    registered.length,
    11
  );

  for (
    const route
    of [
      '/api/v2/release/status',
      '/api/v2/release/metadata',
      '/api/v2/release/promotion-readiness',
      '/api/v2/release/actions/verify-gate',
      '/api/v2/release/actions/approve-promotion',
      '/api/v2/release/promotion-approval',
      '/api/v2/release/execution-receipts',
      '/api/v2/release/finalization-readiness',
      '/api/v2/release/actions/verify-finalization',
      '/api/v2/release/actions/approve-finalization',
      '/api/v2/release/finalization-approval'
    ]
  ) {
    assert.strictEqual(
      registered.some(
        (entry) =>
          entry.route === route
      ),
      true,
      `Hiányzó route: ${route}`
    );
  }

  const mapped =
    mapReleaseError(
      ReleaseServiceError
        .confirmationRequired()
    );

  assert.strictEqual(
    mapped.statusCode,
    400
  );

  assert.strictEqual(
    mapped.code,
    'PROMOTION_CONFIRMATION_REQUIRED'
  );

  console.log(
    'OK: 11 release, promóciós és finalization API v2 route'
  );

  console.log(
    'OK: release service hibaleképezés'
  );
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );

  process.exitCode = 1;
}
