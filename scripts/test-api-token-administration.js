'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  ApiTokenRepository
} = require('../server/security/api-token-repository');

const {
  ApiTokenService
} = require('../server/security/api-token-service');

const {
  ApiTokenStore
} = require('../server/security/api-token-store');

async function main() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), 'api-token-admin-')
  );

  try {
    const store = new ApiTokenStore({
      entries: [{
        id: 'bootstrap-admin',
        token: 'bootstrap-admin-token-1234567890-abcdef',
        role: 'admin',
        enabled: true
      }]
    });

    const repository = new ApiTokenRepository({
      filePath: path.join(root, 'api-v2-tokens.json'),
      maximumRecords: 10
    });

    const events = [];

    const service = new ApiTokenService({
      repository,
      tokenStore: store,
      eventBus: {
        publish(topic, payload) {
          events.push({ topic, payload });
        }
      },
      tokenBytes: 32
    });

    assert.deepStrictEqual(service.initialize(), []);

    const created = await service.create({
      label: 'Desktop',
      role: 'operator'
    });

    assert.match(created.token, /^alc2_/);
    assert.strictEqual(created.record.role, 'operator');
    assert.strictEqual(
      store.authenticate(created.token).subject,
      created.record.id
    );

    const storedText = fs.readFileSync(
      path.join(root, 'api-v2-tokens.json'),
      'utf8'
    );

    assert.strictEqual(
      storedText.includes(created.token),
      false
    );

    assert.match(storedText, /"tokenHash": "[a-f0-9]{64}"/);

    const rotated = await service.rotate(
      created.record.id,
      { role: 'viewer' }
    );

    assert.strictEqual(
      store.authenticate(created.token),
      null
    );

    assert.strictEqual(
      store.authenticate(rotated.token).role,
      'viewer'
    );

    await service.update(
      rotated.record.id,
      { enabled: false }
    );

    assert.strictEqual(
      store.authenticate(rotated.token),
      null
    );

    await service.remove(created.record.id);

    assert.ok(events.length >= 4);

    console.log('OK: hash-elt kezelt API-token repository');
    console.log('OK: token létrehozás, rotáció, tiltás és törlés');
    console.log('OK: környezeti token visszafelé kompatibilis');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
});
