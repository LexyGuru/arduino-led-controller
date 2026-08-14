'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const version = fs.readFileSync('VERSION','utf8').trim();
const rv = JSON.parse(fs.readFileSync('release-versions.json','utf8'));

assert.equal(version,'5.5.1-beta.1');
assert.equal(rv.application,version);
assert.equal(rv.firmware,'5.0.0-beta.8');
assert.equal(rv.directApi,'1.0.0');

for (const p of [
  'package.json',
  'desktop-tauri/package.json',
  'desktop-tauri/src-tauri/tauri.conf.json',
  'web-lxc/package.json'
]) assert.equal(JSON.parse(fs.readFileSync(p,'utf8')).version,version,p);

for (const p of [
  'package-lock.json',
  'desktop-tauri/package-lock.json',
  'web-lxc/package-lock.json'
]) {
  if (!fs.existsSync(p)) continue;
  const d=JSON.parse(fs.readFileSync(p,'utf8'));
  assert.equal(d.version,version,p);
  if (d.packages?.['']) assert.equal(d.packages[''].version,version,p+' root');
}

assert.equal(JSON.parse(fs.readFileSync('docs/api/openapi-v2.json','utf8')).info.version,version);

for (const p of [
  'desktop-tauri/src/api/generated/api-v2-types.ts',
  'desktop-tauri/src/api/generated/api-v2-operations.ts',
  'desktop-tauri/src/api/generated/api-v2-client.ts',
]) {
  const s=fs.readFileSync(p,'utf8');
  assert.ok(s.includes('OpenAPI verzió: 5.5.1-beta.1'),p);
}

for (const p of [
  'RELEASE_NOTES_5.5.1-beta.1.md',
  'docs/v5/V55_BETA1_RELEASE_NOTES.md',
  'docs/v5/V55_BETA1_INSTALLATION_GUIDE.md',
  'docs/v5/V55_BETA1_RELEASE_CHECKLIST.md'
]) assert.ok(fs.existsSync(p),p);

const readme=fs.readFileSync('README.md','utf8');
assert.ok(readme.includes('| Alkalmazás | **`5.5.1-beta.1`** |'));
assert.ok(readme.includes('V55_BETA1_RELEASE_NOTES.md'));

const workflow=fs.readFileSync('.github/workflows/beta-release.yml','utf8');
assert.ok(workflow.includes('EXPECTED_VERSION: 5.5.1-beta.1'));

const tauriApi=fs.readFileSync('desktop-tauri/src/services/tauriApi.ts','utf8');
assert.match(tauriApi,/APP_VERSION\s*=\s*['"]5\.5\.1-beta\.1['"]/);

const stagingEnv=fs.readFileSync('deploy/staging.env.example','utf8');
assert.ok(stagingEnv.includes('RELEASE_TARGET_VERSION=5.5.1-beta.1'));
assert.ok(stagingEnv.includes('RELEASE_CANDIDATE=beta.1-gate'));
assert.doesNotMatch(stagingEnv,/RELEASE_CANDIDATE=beta\.3-gate/);

const hotfixContract=fs.readFileSync('scripts/test-v55-beta2-hotfix-contract-v356.js','utf8');
assert.ok(hotfixContract.includes(String.raw`^5\.5\.\d+-beta\.\d+$`));
assert.ok(!hotfixContract.includes(String.raw`^5\.5\.0-beta\.\d+$`));

console.log('APPLICATION_VERSION=5.5.1-beta.1');
console.log('FIRMWARE_VERSION=5.0.0-beta.8');
console.log('CURRENT_RELEASE_DOCUMENT_SET=V55_BETA1');
console.log('OPENAPI_GENERATED_ARTIFACTS=5.5.1-beta.1');
console.log('DERIVED_RELEASE_CANDIDATE=beta.1-gate');
console.log('V430_MEGA_VERSION_CONTRACT=PASSED');
