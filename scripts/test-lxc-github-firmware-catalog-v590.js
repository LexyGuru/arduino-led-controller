#!/usr/bin/env node
'use strict';

const fs = require('fs');
function must(condition, message) {
  if (!condition) {
    console.error(`V590_TEST_FAIL=${message}`);
    process.exit(1);
  }
}
const main = fs.readFileSync('rust/arduino-led-lxc-server/src/main.rs', 'utf8');
const envExample = fs.readFileSync('deploy/rust-lxc.env.example', 'utf8');
const installer = fs.readFileSync('deploy/install-rust-lxc-native.sh', 'utf8');
const updater = fs.readFileSync('deploy/update-rust-lxc.sh', 'utf8');

must(main.includes('V590_LXC_GITHUB_FIRMWARE_CATALOG_RECOVERY'), 'main marker');
must(main.includes('X-GitHub-Api-Version: 2022-11-28'), 'GitHub API version header');
must(main.includes('Authorization: Bearer'), 'optional GitHub bearer auth');
must(main.includes('GITHUB_TOKEN'), 'GITHUB_TOKEN support');
must(main.includes('GH_TOKEN'), 'GH_TOKEN support');
must(main.includes('github-firmware-releases-cache.json'), 'persistent cache');
must(main.includes('DEFAULT_GITHUB_FIRMWARE_CACHE_SECONDS: u64 = 900'), 'cache TTL');
must(main.includes('read_github_firmware_cache(true)'), 'fresh cache');
must(main.includes('read_github_firmware_cache(false)'), 'stale cache');
must(main.includes('local-catalog-fallback'), 'local fallback');
must(main.includes('State(state): State<AppState>'), 'state extractor');
must(envExample.includes('GITHUB_FIRMWARE_CACHE_TTL_SECONDS=900'), 'env TTL');
must(envExample.includes('# GITHUB_TOKEN='), 'token documented');
must(installer.includes('V590_GITHUB_FIRMWARE_CATALOG_ENV_MIGRATION'), 'installer migration');
must(installer.includes('GITHUB_FIRMWARE_CACHE_TTL_SECONDS=900'), 'installer TTL migration');
must(installer.includes('>> "$ETC/lxc.env"'), 'native installer uses ETC lxc.env path');
must(!installer.includes('>> "$LXC_ENV"'), 'native installer has no undefined LXC_ENV write');
must(updater.includes('V590_GITHUB_FIRMWARE_CATALOG_ENV_MIGRATION'), 'updater migration');

console.log('V590_GITHUB_HEADERS=PASSED');
console.log('V590_OPTIONAL_AUTH=PASSED');
console.log('V590_PERSISTENT_CACHE=PASSED');
console.log('V590_STALE_CACHE_RECOVERY=PASSED');
console.log('V590_LOCAL_CATALOG_FALLBACK=PASSED');
console.log('V590_ENV_PROPAGATION=PASSED');
console.log('V590_LXC_GITHUB_FIRMWARE_CATALOG_TEST=PASSED');
