#!/usr/bin/env node
const fs = require('fs');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const api = fs.readFileSync('desktop-tauri/src/api/create-desktop-api.ts', 'utf8');
const rust = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs', 'utf8');
const bridge = fs.readFileSync('desktop-tauri/src-tauri/src/credential_bridge.rs', 'utf8');

assert(api.includes('if (options.allowPersistentBearer !== true)'),
  'Direct Mode legacy bearer guard missing');

const fwStart = rust.indexOf('async fn firmware_status(');
const fwEnd = rust.indexOf('async fn firmware_update_inner(', fwStart);
assert(fwStart >= 0 && fwEnd > fwStart, 'firmware_status boundary missing');
const fwStatus = rust.slice(fwStart, fwEnd);

assert(!fwStatus.includes('read_profile_ota_password(&config).await'),
  'firmware_status still reads OTA password from Keychain');
assert(fwStatus.includes('status.ota_password_configured = true;'),
  'deferred OTA password validation marker missing');

const updateStart = rust.indexOf('async fn firmware_update_inner(');
const updateBody = rust.slice(updateStart);
assert(updateBody.includes('let password = read_profile_ota_password(&config).await?;'),
  'actual OTA update must still read password securely');

assert(bridge.includes('if let Some(secret) = cached(&account)'),
  'credential session cache must remain active');

console.log('DIRECT_MODE_LEGACY_BEARER_BOOTSTRAP=BLOCKED');
console.log('FIRMWARE_CHECK_KEYCHAIN_READ=BLOCKED');
console.log('OTA_INSTALL_KEYCHAIN_READ=PRESERVED');
console.log('CREDENTIAL_SESSION_CACHE=PRESERVED');
console.log('KEYCHAIN_SINGLE_ACCESS_CONTRACT=PASSED');
