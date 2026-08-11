#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

const {
  DEFAULT_OUTPUT,
  generateOpenApiTypescript
} = require('./generate-openapi-typescript');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const openapi = JSON.parse(fs.readFileSync('docs/api/openapi-v2.json', 'utf8'));
assert(openapi.info.version === '5.0.0-beta.10', 'OpenAPI must be Beta.9');

const expectedFiles = [
  'api-v2-types.ts',
  'api-v2-operations.ts',
  'api-v2-client.ts',
  'index.ts'
];

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'beta8-openapi-sync-'));
try {
  const result = generateOpenApiTypescript({ outputDir: tmp });
  assert(result.version === '5.0.0-beta.10', 'generator version mismatch');

  for (const file of expectedFiles) {
    const generated = fs.readFileSync(path.join(tmp, file), 'utf8');
    const committed = fs.readFileSync(path.join(DEFAULT_OUTPUT, file), 'utf8');
    assert(generated === committed, `generated file mismatch: ${file}`);

    if (file !== 'index.ts') {
      assert(
        committed.includes('/* OpenAPI verzió: 5.0.0-beta.10 */'),
        `Beta.9 generated header missing: ${file}`
      );
    }
  }

  console.log('OPENAPI_VERSION=5.0.0-beta.10');
  console.log(`OPENAPI_OPERATIONS=${result.operations}`);
  console.log(`OPENAPI_SCHEMAS=${result.schemas}`);
  console.log('GENERATED_API_V2_FILES=DETERMINISTIC');
  console.log('BETA8_OPENAPI_GENERATED_SYNC=PASSED');
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
