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
    /^5\.0\.0-alpha\.[1-9]\d*$/,
    'A projektverzió nem érvényes alpha verzió.'
  );

  assert.strictEqual(
    openApi.info.version,
    packageData.version,
    'Az OpenAPI és a package.json verziója eltér.'
  );

  assert.strictEqual(
    openApi.openapi,
    '3.1.0',
    'Az OpenAPI dokumentum verziója nem 3.1.0.'
  );

  assert.ok(
    Object.keys(
      openApi.paths
    ).length >= 40,
    'Az OpenAPI dokumentumban kevesebb mint 40 útvonal van.'
  );

  assert.match(
    checklist,
    /Teljes izolált LXC integrációs(?: és rollback)? teszt/i,
    'A checklistből hiányzik a teljes izolált LXC integrációs teszt.'
  );

  assert.ok(
    releaseGate.includes(
      'deploy/test-alpha2-candidate.sh'
    ),
    'A release-gate dokumentum nem hivatkozik a candidate tesztre.'
  );

  assert.strictEqual(
    manifest.package,
    'v5-admin-openapi-observability-lifecycle-ready',
    'A korábbi admin/OpenAPI csomagmanifest neve eltér.'
  );

  assert.strictEqual(
    manifest.currentVersion,
    '5.0.0-alpha.1',
    'Az archivált csomagmanifest forrásverziója megváltozott.'
  );

  assert.strictEqual(
    manifest.releaseTarget,
    '5.0.0-alpha.2',
    'Az archivált csomagmanifest célverziója megváltozott.'
  );

  assert.ok(
    manifest.fileCountExcludingManifest >= 50,
    'A csomagmanifestben kevesebb mint 50 fájl szerepel.'
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
