const fs = require('fs');
const lib = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs', 'utf8');
const staging = fs.readFileSync('.github/workflows/tauri-artifact-build.yml', 'utf8');
function requireMatch(value, regex, label) {
  if (!regex.test(value)) throw new Error(`Missing contract: ${label}`);
}
requireMatch(lib, /OTA_LISTENER_STARTUP_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(120\)/, '120 second OTA listener startup window');
requireMatch(lib, /OTA_CONNECT_RETRY_DELAY:\s*Duration\s*=\s*Duration::from_secs\(1\)/, 'one second retry delay');
requireMatch(lib, /'connect_attempts: loop/, 'time based OTA listener retry loop');
requireMatch(lib, /std::thread::sleep\(OTA_CONNECT_RETRY_DELAY\)/, 'retry wait');
requireMatch(lib, /CONFIRM_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(180\)/, 'existing post-flash restart confirmation');
requireMatch(lib, /A Tauri beépített OTA-kliense \{\} másodperc várakozás után sem tudott kapcsolódni/, 'failure only after startup timeout');
requireMatch(staging, /push:[\s\S]*next\/v5-rearchitecture/, 'NEXT push trigger');
requireMatch(staging, /build-android:/, 'Android staging job');
requireMatch(staging, /name:\s*Android APK and AAB/, 'proven Android job identity');
requireMatch(staging, /@tauri-apps\/cli@2\.11\.4/, 'pinned Tauri CLI');
requireMatch(staging, /npx tauri android build --ci/, 'Android build');
requireMatch(staging, /arduino-led-controller-android-staging/, 'Android artifact');
requireMatch(staging, /build-ios:/, 'iOS staging job');
requireMatch(staging, /name:\s*Unsigned iOS and iPadOS IPA/, 'proven iOS job identity');
requireMatch(staging, /targets:\s*aarch64-apple-ios/, 'iOS Rust target');
requireMatch(staging, /npx tauri ios init --ci/, 'iOS init');
requireMatch(staging, /npx tauri ios build --ci --no-sign/, 'unsigned iOS build');
requireMatch(staging, /arduino-led-controller-ios-ipados-staging/, 'iOS artifact');
if (/Publish GitHub prerelease/.test(staging) || /gh release/.test(staging)) {
  throw new Error('Staging workflow must not publish a GitHub release');
}
console.log('OTA_LISTENER_STARTUP_RETRY_CONTRACT=PASSED');
console.log('POST_FLASH_RESTART_CONFIRMATION=PRESERVED');
console.log('NEXT_PUSH_ANDROID_STAGING_ARTIFACT=PASSED');
console.log('NEXT_PUSH_IOS_IPADOS_STAGING_ARTIFACT=PASSED');
console.log('STAGING_RELEASE_PUBLICATION=ABSENT');
console.log('MOBILE_OTA_STAGING_WORKFLOW_V354_CONTRACT=PASSED');
