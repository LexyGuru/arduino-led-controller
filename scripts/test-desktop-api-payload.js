'use strict';

const assert =
  require('assert');

async function main() {
  const {
    asArray,
    readApiError,
    unwrapApiPayload
  } =
    await import(
      '../desktop-tauri/src/api/ui/api-payload.mjs'
    );

  const wrapped = {
    source:
      'network',
    data: {
      success: true,
      data: {
        value: 42
      }
    }
  };

  assert.deepStrictEqual(
    unwrapApiPayload(
      wrapped
    ),
    {
      value: 42
    }
  );

  assert.deepStrictEqual(
    asArray({
      success: true,
      data: {
        snapshots: [
          {
            id: 'one'
          }
        ]
      }
    }),
    [
      {
        id: 'one'
      }
    ]
  );

  const error =
    readApiError({
      code:
        'MAINTENANCE_MODE',
      message:
        'Karbantartás',
      statusCode:
        503
    });

  assert.strictEqual(
    error.status,
    503
  );

  console.log(
    'OK: API envelope és runtime cache kibontása'
  );
  console.log(
    'OK: egységes desktop API hibanézet'
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
