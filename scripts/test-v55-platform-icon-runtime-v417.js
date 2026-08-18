"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const theme = fs.readFileSync("desktop-tauri/src/design-system/ThemeProvider.tsx", "utf8");
const sidebar = fs.readFileSync("desktop-tauri/src/components/Sidebar.tsx", "utf8");
const rust = fs.readFileSync("desktop-tauri/src-tauri/src/lib.rs", "utf8");
const cargo = fs.readFileSync("desktop-tauri/src-tauri/Cargo.toml", "utf8");
const beta = fs.readFileSync(".github/workflows/app-beta-release.yml", "utf8");
const staging = fs.readFileSync(".github/workflows/app-staging-build.yml", "utf8");
const generator = fs.readFileSync("scripts/generate-v5-mobile-icons.sh", "utf8");
assert.match(theme, /V417_MACOS_DOCK_ICON_FOLLOWS_RESOLVED_MODE/);
assert.match(theme, /macos_sync_app_icon/);
assert.match(theme, /theme:\s*resolvedMode/);
assert.match(theme, /\[resolvedMode\]/);
assert.doesNotMatch(sidebar, /macos_sync_app_icon|currentDayNightIconTheme|60_000/);
assert.match(rust, /fn macos_sync_app_icon/);
assert.match(rust, /setApplicationIconImage/);
assert.match(rust, /macos_sync_app_icon,/);
assert.match(cargo, /objc2-app-kit/);
for (const f of [
  "desktop-tauri/src-tauri/icons/runtime/v5-beta-light.png",
  "desktop-tauri/src-tauri/icons/runtime/v5-beta-dark.png",
  "desktop-tauri/src-tauri/icons/runtime/v5-stable-light.png",
  "desktop-tauri/src-tauri/icons/runtime/v5-stable-dark.png"
]) { assert.ok(fs.existsSync(f) && fs.statSync(f).size > 0, `missing ${f}`); }
for (const wf of [beta, staging]) {
  assert.match(wf, /Generate V5 Android launcher icons/);
  assert.match(wf, /Generate V5 iOS and iPadOS app icons/);
  assert.match(wf, /generate-v5-mobile-icons\.sh/);
}
assert.match(generator, /npx tauri icon/);
assert.match(generator, /v5-beta-light\.png/);
assert.match(generator, /v5-stable-light\.png/);
assert.match(generator, /AppIcon-512@2x\.png/);
console.log("MACOS_DOCK_ICON_FOLLOWS_RESOLVED_APP_MODE=YES");
console.log("MACOS_COMPETING_CLOCK_TIMER=REMOVED");
console.log("ANDROID_CLEAN_CI_ICON_GENERATION=WIRED");
console.log("IOS_CLEAN_CI_ICON_GENERATION=WIRED");
console.log("V55_PLATFORM_ICON_RUNTIME_V417=PASSED");
