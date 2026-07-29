'use strict';

const assert =
  require('assert');

const fs =
  require('fs');

const os =
  require('os');

const path =
  require('path');

const {
  createRuntimePaths
} =
  require(
    '../server/core/runtime-paths'
  );

const {
  Alpha2OrchestrationService
} =
  require(
    '../server/release/alpha2-orchestration-service'
  );

const root =
  fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      'alpha2-orchestration-wiring-'
    )
  );

try {
  const paths =
    createRuntimePaths(
      {},
      root
    );

  for (
    const property
    of [
      'releaseOrchestrationStateFile',
      'releaseOrchestrationArtifactDir',
      'releaseOrchestrationArtifactIndexFile',
      'releaseProductionGuardFile',
      'releaseProductionGuardVerificationFile'
    ]
  ) {
    assert.strictEqual(
      typeof paths[property],
      'string'
    );

    assert.ok(
      paths[property]
    );
  }

  assert.doesNotThrow(
    () =>
      new Alpha2OrchestrationService({
        stateFile:
          paths.releaseOrchestrationStateFile,
        artifactIndexFile:
          paths.releaseOrchestrationArtifactIndexFile,
        productionGuardFile:
          paths.releaseProductionGuardFile,
        productionGuardVerificationFile:
          paths.releaseProductionGuardVerificationFile,
        receiptDirectory:
          paths.releaseExecutionReceiptDir
      })
  );

  const server =
    fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'server2_final.js'
      ),
      'utf8'
    );

  assert.match(
    server,
    /const alpha2OrchestrationService =/
  );

  assert.match(
    server,
    /alpha2OrchestrationService,\s*socketGateway,/
  );

  console.log(
    'OK: alpha.2 orchestration runtime útvonalak'
  );

  console.log(
    'OK: server2_final orchestration service bekötés'
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
