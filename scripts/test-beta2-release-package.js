#!/usr/bin/env node
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root,p),'utf8');
const json = p => JSON.parse(read(p));
const app='5.0.0-beta.2', fw='4.3.0-beta.1';
assert.strictEqual(read('VERSION').trim(), app);
for (const p of ['package.json','desktop-tauri/package.json','desktop-tauri/src-tauri/tauri.conf.json']) assert.strictEqual(json(p).version,app,p);
assert.match(read('desktop-tauri/src-tauri/Cargo.toml'),/version\s*=\s*"5\.0\.0-beta\.2"/);
assert.match(read('.github/workflows/beta-release.yml'),/EXPECTED_VERSION: 5\.0\.0-beta\.2/);
assert.match(read('.github/workflows/beta-release.yml'),/EXPECTED_FIRMWARE_VERSION: 4\.3\.0-beta\.1/);
assert.match(read('.github/workflows/beta-release.yml'),/latest-beta\.json/);
assert.match(read('.github/workflows/beta-release.yml'),/"schemaVersion": 2/);
assert.match(read('.github/workflows/beta-release.yml'),/directApiVersion/);
assert.match(read('.github/workflows/beta-release.yml'),/\.bin\.sha256/);
for (const p of ['docs/v5/BETA2_INSTALLATION_GUIDE.md','docs/v5/BETA2_RELEASE_NOTES.md','docs/v5/BETA2_RELEASE_CHECKLIST.md']) {
 const s=read(p); assert.match(s,/5\.0\.0-beta\.2/); assert.match(s,/4\.3\.0-beta\.1/);
}
assert.match(read('deploy/install-beta-lxc.sh'),/5\.0\.0-beta\.2/);
assert.match(read('deploy/staging.env.example'),/RELEASE_CANDIDATE=beta\.2-gate/);
assert.match(read('deploy/staging.env.example'),/RELEASE_TARGET_VERSION=5\.0\.0-beta\.2/);
assert.match(read('CHANGELOG.md'),/5\.0\.0-beta\.2 \/ firmware 4\.3\.0-beta\.1/);
assert.doesNotMatch(read('docs/v5/BETA1_RELEASE_NOTES.md'),/5\.0\.0-beta\.2/);
console.log(`OK: Beta.2 app ${app} paired with firmware ${fw}`);
console.log('OK: release manifest v2, latest-beta channel manifest and firmware checksum asset');
console.log('OK: Beta.1 historical documents preserved');
