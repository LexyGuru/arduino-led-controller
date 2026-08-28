#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const release=JSON.parse(fs.readFileSync('release-versions.json','utf8'));
const read=p=>fs.readFileSync(p,'utf8');

assert.equal(release.application,'6.0.0-beta.8');
assert.equal(release.applicationRelease.version,'6.0.0-beta.8');
assert.equal(release.firmware,'5.1.0-beta.4');
assert.equal(release.directApi,'1.2.0');

assert.match(read('desktop-tauri/src/services/tauriApi.ts'),/const\s+APP_VERSION\s*=\s*['"]6\.0\.0-beta\.8['"]/);
assert.ok(read('deploy/staging.env.example').includes('RELEASE_TARGET_VERSION=6.0.0-beta.8'));
assert.ok(read('deploy/staging.env.example').includes('RELEASE_CANDIDATE=beta.8-gate'));

const rust=read('desktop-tauri/src-tauri/src/lib.rs');
const start=rust.indexOf("let artifact = if let Some(version) = requested_tag {");
const end=rust.indexOf("let available = artifact",start);
assert.ok(start>=0&&end>start);
const block=rust.slice(start,end);
assert.ok(block.includes('firmware_releases_for_channel(normalized_channel)'));
assert.ok(!block.includes('github_releases()'));

for(const p of [
 'docs/v5/V60_BETA8_RELEASE_NOTES.md',
 'docs/v5/V60_BETA8_INSTALLATION_GUIDE.md',
 'docs/v5/V60_BETA8_RELEASE_CHECKLIST.md',
 'RELEASE_NOTES_6.0.0-beta.8.md'
]) assert.ok(fs.existsSync(p),p);

const readme=read('README.md');
for(const x of ['6.0.0-beta.8','V60_BETA8_RELEASE_NOTES.md','V60_BETA8_INSTALLATION_GUIDE.md','V60_BETA8_RELEASE_CHECKLIST.md','RELEASE_NOTES_6.0.0-beta.8.md'])
 assert.ok(readme.includes(x),x);

console.log('V863B_BETA8_PARTIAL_RESUME_CONTRACT=PASSED');
