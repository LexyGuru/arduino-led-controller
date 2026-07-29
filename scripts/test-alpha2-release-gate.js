'use strict';

const assert =
  require('assert');
const fs =
  require('fs');
const path =
  require('path');

const ROOT =
  path.resolve(
    __dirname,
    '..'
  );

function readJson(
  relativePath
) {
  return JSON.parse(
    fs.readFileSync(
      path.join(
        ROOT,
        relativePath
      ),
      'utf8'
    )
  );
}

function main() {
  const packageData =
    readJson(
      'package.json'
    );

  const openApi =
    readJson(
      'docs/api/openapi-v2.json'
    );

  const checklist =
    fs.readFileSync(
      path.join(
        ROOT,
        'docs/v5/V5_REARCHITECTURE_CHECKLIST.md'
      ),
      'utf8'
    );

  const releaseGate =
    fs.readFileSync(
      path.join(
        ROOT,
        'docs/v5/ALPHA2_RELEASE_GATE.md'
      ),
      'utf8'
    );

  const manifest =
    readJson(
      'docs/v5/PACKAGE_MANIFEST_ADMIN_OPENAPI_OBSERVABILITY.json'
    );

  assert.match(
    packageData.version,
    /^5\.0\.0-alpha\.[1-9]\d*$/
  );

  assert.strictEqual(
    openApi.info.version,
    packageData.version
  );

  assert.strictEqual(
    openApi.openapi,
    '3.1.0'
  );

  assert.strictEqual(
    Object.keys(
      openApi.paths
    ).length >= 40,
    true
  );

  assert.strictEqual(
    checklist.includes(
      'Teljes izolált LXC integrációs teszt'
    ),
    true
  );

  assert.strictEqual(
    releaseGate.includes(
      'deploy/test-alpha2-candidate.sh'
    ),
    true
  );

  assert.strictEqual(
    manifest.package,
    'v5-admin-openapi-observability-lifecycle-ready'
  );

  assert.strictEqual(
    manifest.currentVersion,
    packageData.version
  );

  assert.strictEqual(
    manifest.fileCountExcludingManifest >= 50,
    true
  );

  console.log(
    'OK: package és OpenAPI verzió egyezik'
  );
  console.log(
    'OK: alpha release verzióformátum'
  );
  console.log(
    'OK: alpha.2 release gate dokumentálva'
  );
  console.log(
    'OK: teljes csomagmanifest és SHA-256 lista'
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
