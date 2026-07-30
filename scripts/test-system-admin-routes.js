'use strict';

const assert = require('assert');

const {
  mapSystemError
} = require(
  '../server/api/v2/system-admin-routes'
);

const {
  SystemServiceError
} = require(
  '../server/system/system-error'
);

function main() {
  const mapped =
    mapSystemError(
      SystemServiceError
        .conflict(
          'MAINTENANCE_REQUIRED',
          'Maintenance kell.'
        )
    );

  assert.strictEqual(
    mapped.statusCode,
    409
  );

  assert.strictEqual(
    mapped.code,
    'MAINTENANCE_REQUIRED'
  );

  console.log(
    'OK: rendszer-admin API hibaleképezés'
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
