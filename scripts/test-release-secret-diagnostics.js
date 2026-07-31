'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  scanReleaseTree
} = require('../server/release/release-secret-scanner');

const root = fs.mkdtempSync(
  path.join(os.tmpdir(), 'release-secret-diagnostics-')
);

try {
  const rawSecret = `ghp_${'Z'.repeat(36)}`;

  fs.writeFileSync(
    path.join(root, 'unsafe.txt'),
    `token=${rawSecret}\n`,
    'utf8'
  );

  const result = scanReleaseTree({ root });
  const serialized = JSON.stringify(result);

  assert.strictEqual(result.passed, false);
  assert.ok(Array.isArray(result.findings));
  assert.ok(result.findings.length >= 1);
  assert.strictEqual(result.findings[0].code, 'GITHUB_TOKEN');
  assert.strictEqual(serialized.includes(rawSecret), false);
  assert.match(serialized, /GITHUB_TOKEN/);

  console.log('OK: sikertelen release scan strukturált diagnosztikát ad');
  console.log('OK: a diagnosztika nem tartalmazza a nyers titkot');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
