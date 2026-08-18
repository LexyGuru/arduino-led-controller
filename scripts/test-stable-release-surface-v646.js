#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const wf=read('.github/workflows/app-stable-release.yml');
const publish=wf.slice(wf.indexOf('  publish:'));
const guide=read('docs/v5/V56_STABLE_INSTALLATION_GUIDE.md');
const notes=read('docs/v5/V56_STABLE_RELEASE_NOTES.md');
const checklist=read('docs/v5/V56_STABLE_RELEASE_CHECKLIST.md');

for(const token of [
  'name: Publish GitHub Stable release',
  'cp deploy/install-rust-lxc-native.sh release-assets/',
  'cp deploy/rust-lxc.env.example release-assets/',
  'Arduino LED Controller Stable signed native application update.',
  '--phase stable',
  '"channel": "stable"',
  '"prerelease": False',
  '"productionDeploymentIncluded": True',
  'latest-stable.json',
  'name: Publish or update Stable release',
  'name: Publish stable updater feed alias',
  'Arduino LED Controller Stable Updater Feed',
  'Machine-readable signed Stable updater feed.',
  '--latest=false',
  'name: Verify stable updater feed alias',
  'name: Verify published Stable release',
  'name: stable-complete-release-set',
]) assert.ok(publish.includes(token), `missing stable publish token: ${token}`);

for(const token of [
  'name: Publish GitHub prerelease',
  'cp deploy/install-stable-lxc.sh release-assets/',
  'cp deploy/stable-lxc.env.example release-assets/',
  'Arduino LED Controller Beta signed native application update.',
  '--phase beta',
  '"channel": "beta"',
  '"prerelease": True',
  '"productionDeploymentIncluded": False',
  'latest-beta.json',
  'Beta prerelease',
  'name: Publish beta updater feed alias',
  'name: Verify beta updater feed alias',
  'name: Verify published prerelease',
  'name: beta-complete-release-set',
  'Beta Updater Feed',
  'signed Beta updater feed',
]) assert.ok(!publish.includes(token), `stale Beta publish surface: ${token}`);

assert.equal(
  (publish.match(/"channel": "stable"/g)||[]).length,
  2,
  'Stable publish must contain exactly two Stable JSON channel identities'
);
assert.match(publish,/prerelease: false/);
assert.match(publish,/make_latest: true/);
assert.match(publish,/isPrerelease --jq '\.isPrerelease'\)" = "false"/);

for(const [name,text] of [
  ['guide',guide],
  ['notes',notes],
  ['checklist',checklist],
]) {
  assert.match(text,/5\.6\.1/);
  assert.match(text,/stable/i);
  assert.doesNotMatch(text,/Source branch: `next\/v5-rearchitecture`/);
  assert.doesNotMatch(text,/Application channel: Beta/);
  assert.doesNotMatch(text,/current Stable application on `main` is still `5\.1\.0`/i);
  assert.doesNotMatch(text,/Stable firmware is not published yet/i);
  assert.doesNotMatch(text,/Install the Beta application/i);
}

for(const path of [
  'deploy/install-rust-lxc-native.sh',
  'deploy/rust-lxc.env.example',
  'deploy/build-stable-release-bundle.sh',
]) assert.ok(fs.existsSync(path), path);

console.log('STABLE_PUBLISH_JOB_BETA_RESIDUE=ZERO');
console.log('STABLE_PUBLISH_JSON_CHANNEL_IDENTITIES=PASSED');
console.log('STABLE_UPDATER_ALIAS_CONTRACT=PASSED');
console.log('STABLE_RELEASE_MANIFEST_CONTRACT=PASSED');
console.log('STABLE_DOCUMENTATION_REALITY=PASSED');
console.log('STABLE_RELEASE_SURFACE_V647=PASSED');
