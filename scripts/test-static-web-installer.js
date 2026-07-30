'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  staticWebStatus
} = require('../server/web/static-web-installer');

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'static-web-'));
try {
  const status = staticWebStatus({
    config: {
      web: {
        staticAssetsEnabled: true,
        staticCacheSeconds: 300
      }
    },
    paths: { publicDir: root }
  });
  assert.strictEqual(status.enabled, true);
  assert.strictEqual(status.directoryExists, true);
  assert.strictEqual(status.legacyInlineDashboardEnabled, true);
  console.log('OK: moduláris statikus webes állapot');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
