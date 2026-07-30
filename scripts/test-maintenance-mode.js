'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  MaintenanceModeService,
  createMaintenanceMiddleware
} = require(
  '../server/system/maintenance-mode-service'
);

async function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'maintenance-'
      )
    );

  try {
    const service =
      new MaintenanceModeService({
        stateFile:
          path.join(
            root,
            'maintenance.json'
          )
      });

    assert.strictEqual(
      service.isEnabled(),
      false
    );

    await service.enable({
      reason:
        'Teszt karbantartás',
      principal: {
        subject:
          'admin'
      }
    });

    assert.strictEqual(
      service.isEnabled(),
      true
    );

    const middleware =
      createMaintenanceMiddleware({
        serviceProvider:
          () => service,
        errorSender(
          req,
          res,
          error
        ) {
          res.error = error;
        }
      });

    let nextCalled = false;
    const response = {};

    middleware(
      {
        method: 'POST',
        path: '/leds/1',
        originalUrl:
          '/api/v2/leds/1'
      },
      response,
      () => {
        nextCalled = true;
      }
    );

    assert.strictEqual(
      nextCalled,
      false
    );

    assert.strictEqual(
      response.error.code,
      'MAINTENANCE_MODE'
    );

    await service.disable();

    assert.strictEqual(
      service.isEnabled(),
      false
    );

    console.log(
      'OK: tartós karbantartási mód'
    );
    console.log(
      'OK: írási API blokkolása maintenance alatt'
    );
  } finally {
    fs.rmSync(
      root,
      {
        recursive: true,
        force: true
      }
    );
  }
}

main().catch((error) => {
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
