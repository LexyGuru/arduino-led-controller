'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  ConfigPreflightService
} = require(
  '../server/system/config-preflight-service'
);

async function main() {
  const root =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'preflight-'
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
      new ConfigPreflightService({
        config: {
          service: {
            environment:
              'test'
          },
          arduino: {
            apiPath:
              '/secret',
            apiKey:
              'a'.repeat(32)
          },
          apiV2: {
            allowedOrigins: [
              '*'
            ]
          },
          security: {
            cookieSecure:
              false
          }
        },
        paths: {
          dataDir:
            path.join(root, 'data'),
          configDir:
            path.join(root, 'config'),
          schedulesDir:
            path.join(root, 'schedules'),
          snapshotsDir:
            path.join(root, 'snapshots'),
          migrationDir:
            path.join(root, 'migrations'),
          openApiDocumentFile:
            openApi
        },
        apiTokenStore: {
          configurationChecks() {
            return [{
              name:
                'apiV2Tokens',
              ok: true
            }];
          }
        }
      });

    const result =
      await service.run();

    assert.strictEqual(
      result.ready,
      true
    );

    assert.strictEqual(
      result.summary.blocking,
      0
    );

    console.log(
      'OK: konfigurációs és könyvtár-preflight'
    );
    console.log(
      'OK: blocking és warning összesítés'
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
