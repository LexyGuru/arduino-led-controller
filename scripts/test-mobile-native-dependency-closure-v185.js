const fs = require("fs");
const assert = require("assert");

const cargo = fs.readFileSync("desktop-tauri/src-tauri/Cargo.toml", "utf8");
const cred = fs.readFileSync("desktop-tauri/src-tauri/src/credential_bridge.rs", "utf8");

function section(header) {
  const i = cargo.indexOf(header);
  assert.ok(i >= 0, `missing section: ${header}`);
  const start = i + header.length;
  const next = cargo.indexOf("\n[", start);
  return cargo.slice(start, next >= 0 ? next : cargo.length);
}

const ios = section('[target.\'cfg(target_os = "ios")\'.dependencies]');
const android = section('[target.\'cfg(target_os = "android")\'.dependencies]');
const desktop = section('[target.\'cfg(any(target_os = "macos", target_os = "windows", target_os = "linux"))\'.dependencies]');

assert.match(ios, /^keyring-core\s*=\s*"=1\.0\.0"$/m);
assert.match(ios, /^apple-native-keyring-store\s*=\s*\{[^}]*version\s*=\s*"=1\.0\.1"[^}]*protected[^}]*\}$/m);
assert.match(ios, /^zeroize\s*=\s*"=1\.9\.0"$/m);

assert.match(android, /^keyring-core\s*=\s*"=1\.0\.0"$/m);
assert.match(android, /^android-native-keyring-store\s*=\s*"=1\.0\.0"$/m);
assert.match(android, /^zeroize\s*=\s*"=1\.9\.0"$/m);

assert.match(desktop, /^zeroize\s*=\s*"=1\.9\.0"$/m);

assert.match(cred, /use\s+zeroize::Zeroizing;/);
assert.match(cred, /use\s+keyring_core::\{Entry,\s*Error as KeyringError\};/);
assert.match(cred, /apple_native_keyring_store::protected::Store/);
assert.match(cred, /android_native_keyring_store::Store/);

console.log("IOS_DIRECT_CREDENTIAL_DEPENDENCIES=PASSED");
console.log("ANDROID_DIRECT_CREDENTIAL_DEPENDENCIES=PASSED");
console.log("DESKTOP_ZEROIZE_DEPENDENCY=PASSED");
console.log("MOBILE_NATIVE_DEPENDENCY_CLOSURE_V185=PASSED");
