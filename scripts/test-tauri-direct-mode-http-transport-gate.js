const fs = require('fs');
const assert = require('assert');

const factory = fs.readFileSync(
  'desktop-tauri/src/api/create-desktop-api.ts',
  'utf8'
);
const generatedClient = fs.readFileSync(
  'desktop-tauri/src/api/generated/api-v2-client.ts',
  'utf8'
);
const generatedOps = fs.readFileSync(
  'desktop-tauri/src/api/generated/api-v2-operations.ts',
  'utf8'
);

assert.match(
  factory,
  /const directModeBlockedBackendFetch: typeof fetch = async \(\) =>/
);
assert.match(
  factory,
  /code: 'lxc_tauri_bridge_not_configured'/
);
assert.match(
  factory,
  /fetchImplementation:\s*options\.fetchImplementation \?\? directModeBlockedBackendFetch/
);

// A generated LXC/API v2 szerződés szándékosan megmarad.
assert.ok(generatedClient.includes('/api/v2/system/health'));
assert.ok(generatedOps.includes('/api/v2/system/health'));

console.log('OK: Direct mód API v2 HTTP transportja alapból lokálisan blokkolt');
console.log('OK: explicit/injektált fetchImplementation támogatás megmaradt');
console.log('OK: generated API v2 LXC contract megmaradt');
