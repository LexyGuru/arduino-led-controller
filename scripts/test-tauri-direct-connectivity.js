const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const modulePath = pathToFileURL(path.resolve('desktop-tauri/src/api/runtime/direct-arduino-client.mjs')).href;
  const { DirectArduinoClient } = await import(modulePath);
  const seen = [];
  const client = new DirectArduinoClient({
    profile: { localHost: '10.0.0.117', remoteHost: 'example.ddns.net', privateApiPath: '/private' },
    deviceKey: '123456789012345678901234',
    fetchImpl: async (url) => {
      seen.push(url);
      if (seen.length === 1) throw new Error('LAN offline');
      return { ok: true, status: 200, text: async () => '{}' };
    }
  });

  const result = await client.request('/api/status');
  assert.equal(result.target.kind, 'remote');
  assert.equal(seen.length, 2);
  console.log('OK: helyi végpont hibája után távoli/DDNS fallback');
})().catch((error) => { console.error(error); process.exit(1); });
