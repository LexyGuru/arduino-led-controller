#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const read = (p) => fs.readFileSync(p, 'utf8');

const version = read('VERSION').trim();
const installer = read('deploy/install-staging-service.sh');
const env = read('deploy/staging.env.example');
const betaLxcEnv = read('deploy/beta-lxc.env.example');
const betaLxcInstaller = read('deploy/install-beta-lxc.sh');

assert.equal(version, '5.5.0-beta.1');

assert.match(
  installer,
  /^RELEASE_TARGET_VERSION_DEFAULT=.*VERSION.*$/m,
  'VERSION-based target default missing'
);
assert.ok(
  installer.includes(
    'RELEASE_CANDIDATE_DEFAULT="${RELEASE_TARGET_VERSION_DEFAULT#*-}-gate"'
  ),
  'VERSION-derived candidate default missing'
);
assert.match(
  installer,
  /^RELEASE_NAMESPACE_DEFAULT=.*RELEASE_TARGET_VERSION_DEFAULT.*$/m,
  'VERSION-derived release namespace missing'
);
assert.ok(
  installer.includes(
    'upsert_env RELEASE_CANDIDATE "${RELEASE_CANDIDATE_DEFAULT}"'
  )
);
assert.ok(
  installer.includes(
    'upsert_env RELEASE_TARGET_VERSION "${RELEASE_TARGET_VERSION_DEFAULT}"'
  )
);

for (const token of [
  '${RELEASE_NAMESPACE_DEFAULT}-promotion-approval.json',
  '${RELEASE_NAMESPACE_DEFAULT}-finalization-approval.json',
  '${RELEASE_NAMESPACE_DEFAULT}-orchestration-state.json',
  '${RELEASE_NAMESPACE_DEFAULT}-index.json',
  '${RELEASE_NAMESPACE_DEFAULT}-production-guard.json',
  '${RELEASE_NAMESPACE_DEFAULT}-production-guard-verification.json'
]) {
  assert.ok(installer.includes(token), `Dynamic runtime path missing: ${token}`);
}

for (const [name, text] of [
  ['staging installer', installer],
  ['staging env', env],
  ['beta-lxc env', betaLxcEnv],
  ['beta-lxc installer', betaLxcInstaller]
]) {
  assert.doesNotMatch(text, /__beta\d+_staging_disabled__/i, name);
  assert.doesNotMatch(text, /BETA\d+_STAGING_DISABLED_API_KEY/i, name);
  assert.ok(
    text.includes('__release_staging_disabled__'),
    `${name}: generic release staging isolation path missing`
  );
}

assert.ok(env.includes(`RELEASE_TARGET_VERSION=${version}`));
assert.ok(env.includes('RELEASE_CANDIDATE=beta.1-gate'));
assert.ok(env.includes('ARDUINO_API_PATH=/__release_staging_disabled__'));
assert.ok(env.includes('ARDUINO_API_KEY=<RELEASE_STAGING_DISABLED_API_KEY>'));

assert.doesNotMatch(
  installer,
  /beta9-(?:promotion|finalization|orchestration|production)/i
);
assert.doesNotMatch(
  installer,
  /server-settings\.pre-beta\d+-isolation/i
);

console.log('V55_DYNAMIC_STAGING_VERSION_SOURCE=PASSED');
console.log('V55_DYNAMIC_STAGING_RUNTIME_NAMESPACE=PASSED');
console.log('V55_STAGING_HARDWARE_ISOLATION=PASSED');
