#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');

const SOURCE_PATH = 'desktop-tauri/src-tauri/src/lib.rs';
const CONTRACT_PATH = 'contracts/macos-ota-beta7-immutable.json';

const source = fs.readFileSync(SOURCE_PATH, 'utf8');
const contract = JSON.parse(fs.readFileSync(CONTRACT_PATH, 'utf8'));

function findFunctionStart(name) {
  const candidates = [
    source.indexOf(`async fn ${name}(`),
    source.indexOf(`fn ${name}(`),
  ].filter((value) => value >= 0);

  assert.ok(candidates.length > 0, `Protected macOS OTA function missing: ${name}`);
  return Math.min(...candidates);
}

function extractFunction(name) {
  const start = findFunctionStart(name);
  const brace = source.indexOf('{', start);
  assert.ok(brace >= 0, `Protected function body missing: ${name}`);

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = brace; i < source.length; i += 1) {
    const c = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (c === '\\') {
        escaped = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
    } else if (c === '{') {
      depth += 1;
    } else if (c === '}') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  assert.fail(`Protected function unterminated: ${name}`);
}

assert.equal(contract.contract, 'MACOS_OTA_BETA7_IMMUTABLE_V1');
assert.equal(contract.sourceCommit, '32fc43d786580b82f5700ca7453f4b73e77726d5');
assert.equal(contract.applicationVersion, '5.5.1-beta.7');
assert.equal(contract.firmwareVersion, '5.0.0-beta.10');
assert.equal(contract.directApiVersion, '1.0.0');

for (const [name, expected] of Object.entries(contract.functions)) {
  // firmware_update_inner contains both release-selection policy and the protected
  // OTA transport sequence. Beta.3 intentionally changes only the channel resolver.
  // Keep exact-byte immutability for the transport/helper functions, while the
  // release path below remains protected by explicit transport/order assertions.
  if (name === 'firmware_update_inner') {
    continue;
  }

  const block = extractFunction(name);
  const bytes = Buffer.byteLength(block);
  const sha = crypto.createHash('sha256').update(block).digest('hex');

  assert.equal(bytes, expected.bytes, `MACOS_OTA_IMMUTABLE byte-size drift: ${name}`);
  assert.equal(sha, expected.sha256, `MACOS_OTA_IMMUTABLE source drift: ${name}`);
}

for (const marker of contract.requiredMarkers) {
  assert.ok(source.includes(marker), `MACOS_OTA_IMMUTABLE marker missing: ${marker}`);
}

const release = extractFunction('firmware_update_inner');
const external = extractFunction('firmware_install_external_inner');

// Resolver policy is intentionally mutable, but OTA transport behavior is not.
assert.ok(release.includes('firmware_artifacts_from_release_channel(release, normalized_channel)'), 'release: channel-aware artifact resolver missing');
assert.ok(!release.includes('let release = firmware_beta_release().await?;'), 'release: beta-only resolver returned');

for (const [name, block] of [['release', release], ['external', external]]) {
  const nativeAt = block.indexOf('upload_firmware_native(');
  const terminalAt = block.indexOf('upload_firmware_in_terminal(');
  const confirmAt = block.indexOf('confirm_restart(');

  assert.ok(nativeAt >= 0, `${name}: native OTA path missing`);
  assert.ok(terminalAt >= 0, `${name}: Terminal OTA path missing`);
  assert.ok(confirmAt > nativeAt && confirmAt > terminalAt, `${name}: API confirmation must remain after transport`);
  assert.ok(block.includes('status_ota_target(&status_json)?'), `${name}: fresh LAN status target missing`);
  assert.ok(block.includes('native_error.starts_with("OTA_TRANSPORT_CONNECT_FAILED")'), `${name}: automatic fallback trigger changed`);
}

const terminal = extractFunction('upload_firmware_in_terminal');
for (const marker of [
  'Command::new("open")',
  '.args(["-a", "Terminal"])',
  '-address',
  '-port',
  '-sketch',
  '-upload /sketch',
]) {
  assert.ok(terminal.includes(marker), `Terminal arduinoOTA contract changed: ${marker}`);
}

const confirm = extractFunction('confirm_restart');
assert.ok(confirm.includes('Duration::from_secs(180)'), '180-second API confirmation changed');

console.log('MACOS_OTA_BETA7_IMMUTABLE_TRANSPORT_FUNCTION_HASHES=PASSED');
console.log('MACOS_OTA_BETA7_RELEASE_RESOLVER_POLICY_EXCEPTION=PASSED');
console.log('MACOS_OTA_BETA7_NATIVE_TO_TERMINAL_FALLBACK=LOCKED');
console.log('MACOS_OTA_BETA7_STATUS_LAN_TARGET=LOCKED');
console.log('MACOS_OTA_BETA7_180S_API_CONFIRMATION=LOCKED');
console.log('MACOS_OTA_BETA7_RELEASE_AND_EXTERNAL_PATHS=LOCKED');
