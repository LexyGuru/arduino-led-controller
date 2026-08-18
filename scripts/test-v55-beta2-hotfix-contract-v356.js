const fs = require('fs');

const expected = fs.readFileSync('VERSION', 'utf8').trim();
if (!/^5\.5\.\d+-beta\.\d+$/.test(expected)) {
  throw new Error(`Unsupported V5.5 Beta version: ${expected}`);
}

const files = [
  ['VERSION', expected],
  ['package.json', JSON.parse(fs.readFileSync('package.json', 'utf8')).version],
  ['desktop-tauri/package.json', JSON.parse(fs.readFileSync('desktop-tauri/package.json', 'utf8')).version],
  ['desktop-tauri/src-tauri/tauri.conf.json', JSON.parse(fs.readFileSync('desktop-tauri/src-tauri/tauri.conf.json', 'utf8')).version],
];
for (const [name, value] of files) {
  if (value !== expected) throw new Error(`${name}: expected ${expected}, got ${value}`);
}

const escapedExpected = expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cargo = fs.readFileSync('desktop-tauri/src-tauri/Cargo.toml', 'utf8');
if (!new RegExp(`version\\s*=\\s*"${escapedExpected}"`).test(cargo)) {
  throw new Error('Cargo.toml version mismatch');
}

const workflow = fs.readFileSync('.github/workflows/beta-release.yml', 'utf8');
if (!new RegExp(`EXPECTED_VERSION:\\s*${escapedExpected}`).test(workflow)) {
  throw new Error('beta-release EXPECTED_VERSION mismatch');
}

const lib = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs', 'utf8');
if (!/OTA_LISTENER_STARTUP_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(5\)/.test(lib)) {
  throw new Error('5s OTA listener timeout missing');
}
if (!/CONFIRM_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(180\)/.test(lib)) {
  throw new Error('180s post-flash confirmation missing');
}
if (/OTA_CONNECT_ATTEMPTS/.test(lib)) {
  throw new Error('old attempt-count OTA startup policy remains');
}

console.log(`APP_VERSION=${expected}`);
console.log('OTA_LISTENER_STARTUP_TIMEOUT_SECONDS=5');
console.log('POST_FLASH_CONFIRM_TIMEOUT_SECONDS=180');
console.log('BETA_RELEASE_EXPECTED_VERSION_SYNC=PASSED');
console.log('V55_HOTFIX_DYNAMIC_VERSION_CONTRACT=PASSED');
