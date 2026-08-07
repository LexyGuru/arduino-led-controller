#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const beta = fs.readFileSync('.github/workflows/beta-release.yml', 'utf8');
const firmware = fs.readFileSync('.github/workflows/firmware-beta-release.yml', 'utf8');
const rust = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs', 'utf8');
for (const workflow of [beta, firmware]) {
  assert.ok(!workflow.includes('actions/upload-artifact@v5'));
  assert.ok(!workflow.includes('actions/download-artifact@v5'));
  assert.ok(!workflow.includes('softprops/action-gh-release@v2'));
}
assert.ok(beta.includes('actions/upload-artifact@v6'));
assert.ok(beta.includes('actions/download-artifact@v7'));
assert.ok(beta.includes('softprops/action-gh-release@v3'));
assert.ok(firmware.includes('actions/upload-artifact@v6'));
assert.ok(firmware.includes('actions/download-artifact@v7'));
assert.ok(beta.includes('::notice::Android signing secrets are missing.'));
assert.ok(!beta.includes('::warning::Android signing secrets are missing.'));
assert.ok(beta.includes('brew untap aws/tap || true'));
assert.ok(!beta.includes('HOMEBREW_NO_REQUIRE_TAP_TRUST'));
assert.ok(beta.includes('RUSTFLAGS="-D warnings" cargo check'));
assert.ok(beta.includes('RUSTFLAGS="-D warnings" cargo test'));
assert.ok(beta.includes('RUSTFLAGS="-D warnings" cargo test --locked --manifest-path src-tauri/Cargo.toml --lib'));
assert.match(rust, /fn use_terminal_ota\(_app: &AppHandle, config: &Config\)/);
assert.match(rust, /find_ota_tool\(_app, config\)/);
assert.match(rust, /#\[cfg\(target_os = "macos"\)\]\s*fn percentage_from_ota_line/);
assert.match(rust, /#\[cfg\(target_os = "macos"\)\]\s*fn shell_single_quote/);
console.log('NODE24_ARTIFACT_ACTIONS=PASSED');
console.log('NODE24_RELEASE_ACTION=PASSED');
console.log('IOS_HOMEBREW_TAP_CLEANUP=PASSED');
console.log('ANDROID_UNSIGNED_NOTICE=PASSED');
console.log('RUST_MACOS_CFG_CLEANUP=PASSED');
console.log('RUST_RELEASE_DENY_WARNINGS=PASSED');
console.log('BETA8_RELEASE_WARNING_CLEANUP=PASSED');
