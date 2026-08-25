const fs = require('node:fs');
const assert = require('node:assert/strict');

const settings = fs.readFileSync(
  'desktop-tauri/src/pages/SettingsPage.tsx',
  'utf8'
);
const types = fs.readFileSync(
  'desktop-tauri/src/types/index.ts',
  'utf8'
);
const i18n = fs.readFileSync(
  'scripts/fixtures/i18n-runtime-language-pack-compat-v800.txt',
  'utf8'
);

for (
  const token of [
    'profileName',
    'protocol',
    'otaUseApiHost',
    'otaTimeoutSeconds',
    'updateChannel',
    'autoCheckUpdates',
    'firmwareUpdateChecks'
  ]
) {
  assert.ok(settings.includes(token), `Hiányzó Settings token: ${token}`);
  assert.ok(types.includes(token), `Hiányzó TypeScript token: ${token}`);
}

assert.ok(
  settings.includes('/usr/local/bin/arduinoOTA'),
  'Hiányzó alapértelmezett arduinoOTA útvonal.'
);

assert.ok(
  settings.includes("t('settings.remoteHost')"),
  'A távoli IP/DDNS mező nem fordítási kulcsot használ.'
);

for (
  const label of [
    "'settings.remoteHost': 'Távoli IP vagy DDNS'",
    "'settings.remoteHost': 'Remote IP or DDNS'",
    "'settings.remoteHost': 'Entfernte IP oder DDNS'"
  ]
) {
  assert.ok(
    i18n.includes(label),
    `Hiányzó i18n távoli host felirat: ${label}`
  );
}

console.log(
  'OK: Settings, TypeScript és i18n konfigurációs szerződés'
);
