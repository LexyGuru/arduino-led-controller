#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const r=p=>fs.readFileSync(p,'utf8');

const build=r('.github/workflows/app-build.yml');
const stable=r('.github/workflows/app-stable-release.yml');
const legacy=r('.github/workflows/tauri-desktop.yml');

assert.match(build,/workflow_call:/);
assert.match(build,/build-desktop:/);
assert.match(build,/build-ios:/);
assert.match(build,/build-android:/);
assert.doesNotMatch(build,/\n  release:\n/);
assert.doesNotMatch(build,/gh release create|action-gh-release/);

assert.match(stable,/test "\$\{GITHUB_REF_NAME\}" = "main"/);
assert.match(stable,/uses: \.\/\.github\/workflows\/app-build\.yml/);
assert.match(stable,/name: Stable application GitHub Release/);
assert.match(stable,/if: \$\{\{ inputs\.publish \}\}/);
assert.match(stable,/echo "tag=v\$VERSION"/);
assert.doesNotMatch(stable,/tag=tauri-v/);
assert.match(stable,/Enforce application-only Stable release assets/);
assert.doesNotMatch(stable,/firmware-beta-release\.yml|firmware-stable-release\.yml/);

assert.match(legacy,/Legacy Tauri Stable Release Wrapper/);
assert.match(legacy,/uses: \.\/\.github\/workflows\/app-stable-release\.yml/);
assert.doesNotMatch(legacy,/\n  push:/);
assert.doesNotMatch(legacy,/build-desktop:|build-ios:|build-android:|gh release/);

console.log('STABLE_APP_BUILD_EXTRACTION=PASSED');
console.log('STABLE_APP_RELEASE_OWNS_PUBLISHING=PASSED');
console.log('LEGACY_TAURI_WORKFLOW_WRAPPER=PASSED');
console.log('STABLE_APP_FIRMWARE_ASSET_SEPARATION=PASSED');
console.log('STABLE_ARTIFACT_PIPELINE_MIGRATION=PASSED');
