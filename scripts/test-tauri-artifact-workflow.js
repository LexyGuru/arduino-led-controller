'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const WORKFLOW = path.join(
  ROOT,
  '.github/workflows/tauri-artifact-build.yml'
);

function main() {
  const text = fs.readFileSync(WORKFLOW, 'utf8');

  assert.match(text, /^name: Tauri staging artifact build$/m);
  assert.match(text, /^\s*workflow_dispatch:\s*$/m);
  assert.ok(text.includes('- next/v5-rearchitecture'));
  assert.ok(text.includes('- "feature/v5-*"'));
  assert.match(text, /^permissions:\s*\n\s+contents: read$/m);

  for (const os of ['ubuntu-22.04', 'macos-latest', 'windows-latest']) {
    assert.ok(text.includes(`os: ${os}`), `Hiányzó platform: ${os}`);
  }

  for (const bundle of ['appimage,deb', 'dmg', 'nsis']) {
    assert.ok(text.includes(`bundles: ${bundle}`), `Hiányzó bundle: ${bundle}`);
  }

  assert.ok(text.includes('npm ci --no-audit --no-fund'));
  assert.ok(text.includes('npm run build'));
  assert.ok(text.includes('cargo check --locked'));
  assert.ok(text.includes('cargo test --locked'));
  assert.ok(text.includes('tauri-apps/tauri-action@v1'));
  assert.ok(text.includes('actions/upload-artifact@v5'));

  for (const forbidden of [
    'contents: write',
    'gh release create',
    'gh release upload',
    'softprops/action-gh-release',
    'tagName:',
    'releaseName:',
    'Közös GitHub Release létrehozása'
  ]) {
    assert.strictEqual(
      text.includes(forbidden),
      false,
      `Tiltott public release művelet: ${forbidden}`
    );
  }

  assert.strictEqual(/^\s{2}release:\s*$/m.test(text), false);

  console.log('OK: artifact-only Tauri desktop workflow');
  console.log('OK: Linux, macOS és Windows staging artifact');
  console.log('OK: contents read jogosultság, public release művelet nélkül');
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
