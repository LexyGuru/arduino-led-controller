const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');

(async () => {
  const modulePath = pathToFileURL(path.resolve('desktop-tauri/src/api/runtime/direct-arduino-profile-store.mjs')).href;
  const { normalizeDirectArduinoProfile, validateDirectArduinoProfile, directArduinoTargets, directArduinoUrl } = await import(modulePath);

  const profile = normalizeDirectArduinoProfile({
    localArduinoIp: '10.0.0.117',
    localArduinoPort: 80,
    arduinoIp: 'example.ddns.net',
    arduinoPort: 25666,
    arduinoApiPath: '/private/path/'
  });

  assert.equal(profile.privateApiPath, '/private/path');
  assert.equal(validateDirectArduinoProfile(profile).valid, true);
  assert.deepEqual(directArduinoTargets(profile).map((item) => item.kind), ['local', 'remote']);
  assert.equal(directArduinoUrl(profile, directArduinoTargets(profile)[0], '/api/status'), 'http://10.0.0.117:80/private/path/api/status');
  console.log('OK: Direct Arduino profil normalizálás és célpontsorrend');
})().catch((error) => { console.error(error); process.exit(1); });
