#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict'); const fs=require('node:fs'); const read=p=>fs.readFileSync(p,'utf8');
const helper=read('scripts/ci/install-linux-tauri-deps.sh');
for(const x of ['DEBIAN_FRONTEND=noninteractive','Acquire::Retries=3','Acquire::http::Timeout=30','Acquire::https::Timeout=30','DPkg::Lock::Timeout=','timeout --foreground','CI_APT_ATTEMPTS','LINUX_TAURI_SYSTEM_DEPENDENCIES=READY']) assert.ok(helper.includes(x),`Missing ${x}`);
for(const p of ['libwebkit2gtk-4.1-dev','libappindicator3-dev','librsvg2-dev','patchelf']) assert.ok(helper.includes(p));
const wf={build:read('.github/workflows/app-build.yml'),staging:read('.github/workflows/app-staging-build.yml'),beta:read('.github/workflows/app-beta-release.yml'),stable:read('.github/workflows/app-stable-release.yml')};
for(const [n,t] of Object.entries(wf)){assert.doesNotMatch(t,/sudo apt-get update|sudo apt-get install -y\s+libwebkit2gtk/,`${n}: raw apt remains`);assert.match(t,/install-linux-tauri-deps\.sh/);assert.match(t,/timeout-minutes:\s*15/);}
assert.equal((wf.beta.match(/install-linux-tauri-deps\.sh/g)||[]).length,2); assert.equal((wf.stable.match(/install-linux-tauri-deps\.sh/g)||[]).length,2); assert.equal((wf.staging.match(/install-linux-tauri-deps\.sh/g)||[]).length,1); assert.equal((wf.build.match(/install-linux-tauri-deps\.sh/g)||[]).length,1);
console.log('P1_SHARED_LINUX_TAURI_DEPENDENCY_INSTALLER=PASSED'); console.log('P1_APT_RETRY_TIMEOUT_LOCK_HARDENING=PASSED'); console.log('P1_CANONICAL_APPLICATION_WORKFLOW_COVERAGE=PASSED');
