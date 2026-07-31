const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const modulePath = pathToFileURL(path.resolve('desktop-tauri/src/api/runtime/direct-arduino-client.mjs')).href;
  const { DirectArduinoClient } = await import(modulePath);
  const calls = [];
  const client = new DirectArduinoClient({
    profile: { localHost: '10.0.0.117', privateApiPath: '/private', expectedFirmwareVersion: '4.3.0-beta.1', expectedDirectApiVersion: '1.0.0' },
    deviceKey: '123456789012345678901234',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, text: async () => JSON.stringify({ firmwareVersion: '4.3.0-beta.1', directApiVersion: '1.0.0', queryKeyFallbackEnabled: false }) };
    }
  });

  await client.status();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers['X-Device-Key'], '123456789012345678901234');
  assert.equal(calls[0].url.includes('?'), false);
  console.log('OK: kizárólag X-Device-Key header, query auth nélkül');
})().catch((error) => { console.error(error); process.exit(1); });
