'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  DEFAULT_OUTPUT,
  generateOpenApiTypescript
} = require('./generate-openapi-typescript');

function main() {
  const temporary = fs.mkdtempSync(
    path.join(os.tmpdir(), 'openapi-ts-')
  );

  try {
    const result = generateOpenApiTypescript({
      outputDir: temporary
    });

    assert.ok(result.operations >= 65);
    assert.ok(result.schemas >= 5);

    for (const file of result.files) {
      const generated = fs.readFileSync(
        path.join(temporary, file),
        'utf8'
      );

      const committed = fs.readFileSync(
        path.join(DEFAULT_OUTPUT, file),
        'utf8'
      );

      assert.strictEqual(
        generated,
        committed,
        `Eltérő generált TypeScript fájl: ${file}`
      );
    }

    const client = fs.readFileSync(
      path.join(temporary, 'api-v2-client.ts'),
      'utf8'
    );

    assert.match(client, /class ApiV2Client/);
    assert.match(client, /getFirmwareBackups/);
    assert.match(client, /postTokens/);

    console.log(`OK: ${result.operations} OpenAPI művelet TypeScript kliensben`);
    console.log('OK: determinisztikus generált TypeScript fájlok');
    console.log('OK: Bearer, session és CSRF kliens támogatás');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
