'use strict';

const assert = require('assert');

const {
  ApiTokenStore,
  safeTokenEquals
} = require(
  '../server/security/api-token-store'
);

const {
  apiTokensFromEnvironment
} = require(
  '../server/core/config'
);

function main() {
  const store =
    new ApiTokenStore({
      entries: [
        {
          id: 'desktop',
          token:
            'desktop-token-1234567890-abcdefghijkl',
          role: 'admin'
        },
        {
          id: 'mobile',
          token:
            'mobile-token-1234567890-abcdefghijkl',
          role: 'operator'
        },
        {
          id: 'disabled',
          token:
            'disabled-token-1234567890-abcdefgh',
          role: 'viewer',
          enabled: false
        }
      ]
    });

  assert.strictEqual(
    store.isConfigured(),
    true
  );

  const desktop =
    store.authenticate(
      'desktop-token-1234567890-abcdefghijkl'
    );

  assert.strictEqual(
    desktop.subject,
    'desktop'
  );

  assert.strictEqual(
    desktop.role,
    'admin'
  );

  const mobile =
    store.authenticate(
      'mobile-token-1234567890-abcdefghijkl'
    );

  assert.strictEqual(
    mobile.role,
    'operator'
  );

  assert.strictEqual(
    store.authenticate(
      'disabled-token-1234567890-abcdefgh'
    ),
    null
  );

  assert.strictEqual(
    store.authenticate('wrong-token'),
    null
  );

  assert.strictEqual(
    safeTokenEquals(
      'same-value',
      'same-value'
    ),
    true
  );

  assert.strictEqual(
    safeTokenEquals(
      'different',
      'value'
    ),
    false
  );

  assert.deepStrictEqual(
    store.publicSummary(),
    [
      {
        id: 'desktop',
        role: 'admin',
        enabled: true
      },
      {
        id: 'mobile',
        role: 'operator',
        enabled: true
      },
      {
        id: 'disabled',
        role: 'viewer',
        enabled: false
      }
    ]
  );

  const parsedConfiguration =
    apiTokensFromEnvironment({
      API_V2_TOKENS_JSON:
        '[{"id":"tablet","token":"tablet-token-1234567890-abcdefghijkl","role":"viewer"}]'
    });

  assert.strictEqual(
    parsedConfiguration.parseError,
    null
  );

  assert.strictEqual(
    parsedConfiguration.tokens[0].id,
    'tablet'
  );

  const invalidConfiguration =
    apiTokensFromEnvironment({
      API_V2_TOKENS_JSON:
        '{invalid-json'
    });

  assert.strictEqual(
    typeof invalidConfiguration.parseError,
    'string'
  );

  const fallback =
    ApiTokenStore.fromConfig({
      token:
        'fallback-token-1234567890-abcdefghijk',
      role: 'viewer'
    });

  assert.strictEqual(
    fallback.authenticate(
      'fallback-token-1234567890-abcdefghijk'
    ).role,
    'viewer'
  );

  console.log(
    'OK: több API v2 token és szerepkör'
  );
  console.log(
    'OK: konstans idejű token-összehasonlítás'
  );
  console.log(
    'OK: API_V2_TOKENS_JSON feldolgozás'
  );
  console.log(
    'OK: egytokenes visszafelé kompatibilitás'
  );
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
