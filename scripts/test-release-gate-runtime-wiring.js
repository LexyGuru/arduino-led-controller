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
  ReleaseGateService
} =
  require(
    '../server/release/release-gate-service'
  );

function main() {
  const temporaryRoot =
    fs.mkdtempSync(
      path.join(
        os.tmpdir(),
        'release-gate-wiring-'
      )
    );

  try {
    const paths =
      createRuntimePaths(
        {},
        temporaryRoot
      );

    assert.strictEqual(
      paths.projectRoot,
      path.resolve(
        temporaryRoot
      )
    );

    for (
      const property
      of [
        'projectRoot',
        'releaseGateReportDir',
        'releasePromotionApprovalFile',
        'releaseMetadataFile'
      ]
    ) {
      assert.strictEqual(
        typeof paths[property],
        'string',
        `Hiányzó runtime útvonal: ${property}`
      );

      assert.ok(
        paths[property].trim(),
        `Üres runtime útvonal: ${property}`
      );
    }

    assert.doesNotThrow(
      () =>
        new ReleaseGateService({
          reportDirectory:
            paths.releaseGateReportDir,
          approvalFile:
            paths.releasePromotionApprovalFile,
          projectRoot:
            paths.projectRoot,
          metadataFile:
            paths.releaseMetadataFile,
          version:
            '5.0.0-alpha.1',
          targetVersion:
            '5.0.0-alpha.2'
        })
    );

    const serverEntry =
      fs.readFileSync(
        path.join(
          __dirname,
          '..',
          'server2_final.js'
        ),
        'utf8'
      );

    assert.match(
      serverEntry,
      /projectRoot:\s*paths\.projectRoot,/
    );

    assert.doesNotMatch(
      serverEntry,
      /projectRoot:\s*paths\.root,/
    );

    console.log(
      'OK: ReleaseGateService runtime útvonalak'
    );

    console.log(
      'OK: server2_final projectRoot bekötés'
    );

    console.log(
      'OK: release-gate konstruktor szerverindításkor létrehozható'
    );
  } finally {
    fs.rmSync(
      temporaryRoot,
      {
        recursive: true,
        force: true
      }
    );
  }
}

try {
  main();
} catch (error) {
  console.error(
    `HIBA: ${error.message}`
  );

  process.exitCode = 1;
}
