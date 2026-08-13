const fs = require('fs');

const expected = '5.5.0-beta.2';
const files = [
  ['VERSION', fs.readFileSync('VERSION', 'utf8').trim()],
  ['package.json', JSON.parse(fs.readFileSync('package.json', 'utf8')).version],
  ['desktop-tauri/package.json', JSON.parse(fs.readFileSync('desktop-tauri/package.json', 'utf8')).version],
  ['desktop-tauri/src-tauri/tauri.conf.json', JSON.parse(fs.readFileSync('desktop-tauri/src-tauri/tauri.conf.json', 'utf8')).version],
];
for (const [name, value] of files) {
  if (value !== expected) throw new Error(`${name}: expected ${expected}, got ${value}`);
}

const cargo = fs.readFileSync('desktop-tauri/src-tauri/Cargo.toml', 'utf8');
if (!/version\s*=\s*"5\.5\.0-beta\.2"/.test(cargo)) throw new Error('Cargo.toml version mismatch');

const workflow = fs.readFileSync('.github/workflows/beta-release.yml', 'utf8');
if (!/EXPECTED_VERSION:\s*5\.5\.0-beta\.2/.test(workflow)) throw new Error('beta-release EXPECTED_VERSION mismatch');

const lib = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs', 'utf8');
if (!/OTA_LISTENER_STARTUP_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(5\)/.test(lib)) throw new Error('5s OTA listener timeout missing');
if (!/CONFIRM_TIMEOUT:\s*Duration\s*=\s*Duration::from_secs\(180\)/.test(lib)) throw new Error('180s post-flash confirmation missing');
if (/OTA_CONNECT_ATTEMPTS/.test(lib)) throw new Error('old attempt-count OTA startup policy remains');

console.log('APP_VERSION=5.5.0-beta.2');
console.log('OTA_LISTENER_STARTUP_TIMEOUT_SECONDS=5');
console.log('POST_FLASH_CONFIRM_TIMEOUT_SECONDS=180');
console.log('BETA_RELEASE_EXPECTED_VERSION_SYNC=PASSED');
console.log('V55_BETA2_HOTFIX_CONTRACT_V356=PASSED');
