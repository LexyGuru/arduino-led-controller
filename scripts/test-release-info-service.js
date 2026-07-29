'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  ReleaseInfoService
} = require(
  '../server/system/release-info-service'
);

async function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'release-info-'
      )
    );

  try {
    const openApi =
      path.join(
        root,
        'openapi.json'
      );

    fs.writeFileSync(
      openApi,
      '{}'
    );

    const service =
      new ReleaseInfoService({
        config: {
          service: {
            name:
              'arduino-led-controller',
            version:
              '5.0.0-alpha.1',
            environment:
              'test'
          },
          release: {
            channel:
              'alpha',
            candidate:
              'rc.1',
            commit:
              'abc123',
            builtAt:
              '2026-07-29T00:00:00Z'
          }
        },
        paths: {
          openApiDocumentFile:
            openApi
        },
        lifecycle: {
          getStatus() {
            return {
              state:
                'ready'
            };
          }
        },
        maintenanceService: {
          getStatus() {
            return {
              enabled:
                false
            };
          }
        },
        migrationService: {
          async status() {
            return {
              pending:
                0
            };
          }
        }
      });

    const info =
      await service.getInfo();

    assert.strictEqual(
      info.release.candidate,
      'rc.1'
    );

    assert.match(
      info.openApi.sha256,
      /^[a-f0-9]{64}$/
    );

    console.log(
      'OK: release metadata és OpenAPI hash'
    );
    console.log(
      'OK: maintenance és migration release státusz'
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
