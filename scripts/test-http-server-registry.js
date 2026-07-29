'use strict';

const assert =
  require('assert');
const http =
  require('http');

const {
  HttpServerRegistry,
  installHttpServerRegistryPatch,
  resetHttpServerRegistryPatchForTests
} = require(
  '../server/http/http-server-registry'
);

async function main() {
  const registry =
    new HttpServerRegistry({
      closeTimeoutMs:
        2000
    });

  installHttpServerRegistryPatch(
    registry
  );

  const server =
    http.createServer(
      (req, res) => {
        res.end('ok');
      }
    );

  await new Promise(
    (resolve) =>
      server.listen(
        0,
        '127.0.0.1',
        resolve
      )
  );

  assert.strictEqual(
    registry.status()
      .trackedServers,
    1
  );

  const result =
    await registry.closeAll();

  assert.strictEqual(
    result.total,
    1
  );

  assert.strictEqual(
    result.closed,
    1
  );

  assert.strictEqual(
    server.listening,
    false
  );

  resetHttpServerRegistryPatchForTests();

  console.log(
    'OK: HTTP szerverpéldány követése'
  );
  console.log(
    'OK: explicit HTTP szerverleállítás'
  );
}

main().catch((error) => {
  resetHttpServerRegistryPatchForTests();
  console.error(
    `HIBA: ${error.message}`
  );
  process.exitCode = 1;
});
