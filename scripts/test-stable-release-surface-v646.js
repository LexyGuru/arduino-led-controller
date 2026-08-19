#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const cp=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');

const read=p=>fs.readFileSync(p,'utf8');
const wf=read('.github/workflows/app-stable-release.yml');
const publish=wf.slice(wf.indexOf('  publish:'));
const updaterHelper=read('scripts/generate-stable-tauri-updater-feed-v650.js');
const metadataHelper=read('scripts/generate-stable-release-metadata-v650.js');
const guide=read('docs/v5/V56_STABLE_INSTALLATION_GUIDE.md');
const notes=read('docs/v5/V56_STABLE_RELEASE_NOTES.md');
const checklist=read('docs/v5/V56_STABLE_RELEASE_CHECKLIST.md');

for(const token of [
  'name: Publish GitHub Stable release',
  'cp deploy/install-rust-lxc-native.sh release-assets/',
  'cp deploy/rust-lxc.env.example release-assets/',
  'node scripts/generate-stable-tauri-updater-feed-v650.js',
  'node scripts/generate-stable-release-metadata-v650.js',
  '--phase stable',
  '--target-version "${{ needs.validate.outputs.version }}"',
  '--dependency-install "npm-ci"',
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

assert.match(publish,/prerelease: false/);
assert.match(publish,/make_latest: true/);
assert.match(publish,/isPrerelease --jq '\.isPrerelease'\)" = "false"/);

assert.ok(
  updaterHelper.includes('Arduino LED Controller Stable signed native application update.'),
  'Stable updater notes must live in updater helper'
);
assert.ok(!updaterHelper.includes('Beta signed native application update.'));
assert.ok(metadataHelper.includes("channel:'stable'"));
assert.ok(metadataHelper.includes("prerelease:false"));
assert.ok(metadataHelper.includes("productionDeploymentIncluded:true"));
assert.ok(metadataHelper.includes("'latest-stable.json'"));

const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stable-surface-'));
const version='5.6.1';
for(const [artifact,sig] of [
  [`Arduino_LED_Controller_${version}_Linux_x86_64.AppImage`, `Arduino_LED_Controller_${version}_Linux_x86_64.AppImage.sig`],
  [`Arduino_LED_Controller_${version}_Windows_x86_64_Setup.exe`, `Arduino_LED_Controller_${version}_Windows_x86_64_Setup.exe.sig`],
  [`Arduino_LED_Controller_${version}_macOS_Apple_Silicon.app.tar.gz`, `Arduino_LED_Controller_${version}_macOS_Apple_Silicon.app.tar.gz.sig`],
  [`Arduino_LED_Controller_${version}_macOS_Intel.app.tar.gz`, `Arduino_LED_Controller_${version}_macOS_Intel.app.tar.gz.sig`],
]){
  fs.writeFileSync(path.join(temp,artifact),'artifact');
  fs.writeFileSync(path.join(temp,sig),'signature');
}

cp.execFileSync('node',[
  'scripts/generate-stable-tauri-updater-feed-v650.js',
  '--root',temp,
  '--version',version,
  '--tag',`v${version}`
]);

const latest=JSON.parse(fs.readFileSync(path.join(temp,'latest.json'),'utf8'));
assert.equal(latest.version,version);
assert.equal(latest.notes,'Arduino LED Controller Stable signed native application update.');
for(const key of ['linux-x86_64','windows-x86_64','darwin-aarch64','darwin-x86_64']){
  assert.ok(latest.platforms?.[key]?.url);
  assert.ok(latest.platforms?.[key]?.signature);
}
fs.rmSync(temp,{recursive:true,force:true});

for(const text of [guide,notes,checklist]){
  assert.match(text,/5\.6\.1/);
  assert.match(text,/stable/i);
  assert.doesNotMatch(text,/Source branch: `next\/v5-rearchitecture`/);
  assert.doesNotMatch(text,/Application channel: Beta/);
  assert.doesNotMatch(text,/current Stable application on `main` is still `5\.1\.0`/i);
  assert.doesNotMatch(text,/Stable firmware is not published yet/i);
  assert.doesNotMatch(text,/Install the Beta application/i);
}

for(const file of [
  'deploy/install-rust-lxc-native.sh',
  'deploy/rust-lxc.env.example',
  'deploy/build-stable-release-bundle.sh',
]) assert.ok(fs.existsSync(file),file);

console.log('STABLE_PUBLISH_JOB_BETA_RESIDUE=ZERO');
console.log('STABLE_UPDATER_HELPER_WIRING=PASSED');
console.log('STABLE_UPDATER_GENERATED_NOTES=PASSED');
console.log('STABLE_RELEASE_METADATA_HELPER=PASSED');
console.log('STABLE_UPDATER_ALIAS_CONTRACT=PASSED');
console.log('STABLE_DOCUMENTATION_REALITY=PASSED');
console.log('STABLE_RELEASE_SURFACE_V652=PASSED');
