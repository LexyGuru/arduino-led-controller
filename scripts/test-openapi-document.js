'use strict';

const assert =
  require('assert');
const path =
  require('path');

const {
  OpenApiService
} = require(
  '../server/api/v2/openapi-service'
);

async function main() {
  const service =
    new OpenApiService({
      documentPath:
        path.resolve(
          __dirname,
          '../docs/api/openapi-v2.json'
        )
    });

  const document =
    await service
      .getDocument();

  const summary =
    await service
      .summary();

  assert.strictEqual(
    document.openapi,
    '3.1.0'
  );

  assert.strictEqual(
    summary.paths >= 40,
    true
  );

  assert.strictEqual(
    Boolean(
      document.paths[
        '/api/v2/users'
      ]
    ),
    true
  );

  assert.strictEqual(
    Boolean(
      document.paths[
        '/api/v2/local-schedules/{id}'
      ]?.put
    ),
    true
  );

  assert.strictEqual(
    service
      .docsHtml()
      .includes(
        '/api/v2/openapi.json'
      ),
    true
  );

  console.log(
    'OK: OpenAPI 3.1 dokumentum'
  );
  console.log(
    'OK: legalább 40 dokumentált API útvonal'
  );
  console.log(
    'OK: felhasználó- és schedule update séma'
  );
}

main().catch(
  (error) => {
    console.error(
      `HIBA: ${error.message}`
    );
    process.exitCode = 1;
  }
);
