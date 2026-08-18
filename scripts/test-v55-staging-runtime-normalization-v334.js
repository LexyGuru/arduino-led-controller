#!/usr/bin/env node
'use strict';

const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=p=>fs.readFileSync(p,'utf8');

const version=read('VERSION').trim();
const beta=version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);
const stable=version.match(/^(\d+)\.(\d+)\.(\d+)$/);
assert.ok(beta||stable,`Unsupported current release version: ${version}`);
const releaseCandidate=beta?`beta.${beta[4]}-gate`:'stable-gate';

const installer=read('deploy/install-staging-service.sh');
const env=read('deploy/staging.env.example');
const betaLxcEnv=read('deploy/beta-lxc.env.example');
const betaLxcInstaller=read('deploy/install-beta-lxc.sh');

assert.match(installer,/^RELEASE_TARGET_VERSION_DEFAULT=.*VERSION.*$/m);
assert.ok(installer.includes('RELEASE_CANDIDATE_DEFAULT="${RELEASE_TARGET_VERSION_DEFAULT#*-}-gate"'));
assert.match(installer,/^RELEASE_NAMESPACE_DEFAULT=.*RELEASE_TARGET_VERSION_DEFAULT.*$/m);

for(const token of [
 '${RELEASE_NAMESPACE_DEFAULT}-promotion-approval.json',
 '${RELEASE_NAMESPACE_DEFAULT}-finalization-approval.json',
 '${RELEASE_NAMESPACE_DEFAULT}-orchestration-state.json',
 '${RELEASE_NAMESPACE_DEFAULT}-index.json',
 '${RELEASE_NAMESPACE_DEFAULT}-production-guard.json',
 '${RELEASE_NAMESPACE_DEFAULT}-production-guard-verification.json'
]) assert.ok(installer.includes(token),`Dynamic runtime path missing: ${token}`);

for(const [name,text] of [
 ['staging installer',installer],['staging env',env],
 ['beta-lxc env',betaLxcEnv],['beta-lxc installer',betaLxcInstaller]
]){
 assert.doesNotMatch(text,/__beta\d+_staging_disabled__/i,name);
 assert.doesNotMatch(text,/BETA\d+_STAGING_DISABLED_API_KEY/i,name);
 assert.ok(text.includes('__release_staging_disabled__'));
}

assert.ok(env.includes(`RELEASE_TARGET_VERSION=${version}`));
assert.ok(env.includes(`RELEASE_CANDIDATE=${releaseCandidate}`));
assert.ok(env.includes('ARDUINO_API_PATH=/__release_staging_disabled__'));
assert.ok(env.includes('ARDUINO_API_KEY=<RELEASE_STAGING_DISABLED_API_KEY>'));

console.log(`V55_DYNAMIC_STAGING_VERSION_SOURCE=PASSED:${version}`);
console.log(`V55_DYNAMIC_STAGING_RELEASE_CANDIDATE=PASSED:${releaseCandidate}`);
