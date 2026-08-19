#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = p => fs.readFileSync(p, 'utf8');

const helper = read('scripts/ci/install-linux-tauri-deps.sh');
for (const needle of [
  'DEBIAN_FRONTEND=noninteractive',
  'CI_APT_MIRROR_NORMALIZATION=START',
  'CI_APT_MIRROR_NORMALIZATION=PASSED',
  'https://archive.ubuntu.com/ubuntu',
  'azure\\.archive\\.ubuntu\\.com',
  '--kill-after=',
  'Acquire::ForceIPv4=true',
  'Acquire::http::Timeout=20',
  'Acquire::https::Timeout=20',
  'DPkg::Lock::Timeout=',
  'CI_APT_PHASE=',
  'LINUX_TAURI_SYSTEM_DEPENDENCIES=READY',
  '--no-install-recommends',
  'libwebkit2gtk-4.1-dev',
  'libappindicator3-dev',
  'librsvg2-dev',
  'patchelf',
]) {
  assert.ok(helper.includes(needle), `helper contract missing: ${needle}`);
}
assert.match(helper, /pkill -TERM -x apt-get/);
assert.match(helper, /pkill -KILL -x apt-get/);
assert.match(helper, /dpkg-query/);

const workflows = {
  beta: read('.github/workflows/app-beta-release.yml'),
  stable: read('.github/workflows/app-stable-release.yml'),
  staging: read('.github/workflows/app-staging-build.yml'),
  build: read('.github/workflows/app-build.yml'),
};
for (const text of Object.values(workflows)) {
  assert.doesNotMatch(text, /sudo apt-get update/);
  assert.doesNotMatch(text, /sudo apt-get install/);
  assert.match(text, /install-linux-tauri-deps\.sh/);
  assert.match(text, /timeout-minutes:\s*15/);
}
assert.equal((workflows.beta.match(/install-linux-tauri-deps\.sh/g) || []).length, 2);
assert.equal((workflows.stable.match(/install-linux-tauri-deps\.sh/g) || []).length, 2);
assert.equal((workflows.staging.match(/install-linux-tauri-deps\.sh/g) || []).length, 1);
assert.equal((workflows.build.match(/install-linux-tauri-deps\.sh/g) || []).length, 1);

console.log('P1_SHARED_LINUX_TAURI_DEPENDENCY_INSTALLER=PASSED');
console.log('P1_APT_MIRROR_NORMALIZATION=PASSED');
console.log('P1_APT_PROCESS_TREE_TIMEOUT_HARDENING=PASSED');
console.log('P1_APT_RETRY_TIMEOUT_LOCK_HARDENING=PASSED');
console.log('P1_CANONICAL_APPLICATION_WORKFLOW_COVERAGE=PASSED');
