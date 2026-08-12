#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const sidebar=fs.readFileSync('desktop-tauri/src/components/Sidebar.tsx','utf8');
const lxcMain=fs.readFileSync('web-lxc/src/main.tsx','utf8');

assert.ok(lxcMain.includes("document.documentElement.dataset.runtime='lxc-web'"));
assert.ok(lxcMain.includes("void import('../../desktop-tauri/src/main')"));

assert.doesNotMatch(sidebar,/^import\s+\{\s*getCurrentWindow\s*\}\s+from\s+['"]@tauri-apps\/api\/window['"];?/m);
assert.doesNotMatch(sidebar,/^import\s+\{\s*invoke\s*\}\s+from\s+['"]@tauri-apps\/api\/core['"];?/m);

const hasIconPolicy=sidebar.includes('macos_sync_app_icon');
if(hasIconPolicy){
  for(const marker of [
    "__TAURI_INTERNALS__",
    "import('@tauri-apps/api/core')",
    "import('@tauri-apps/api/window')",
    "window.setInterval",
    "onThemeChanged"
  ]) assert.ok(sidebar.includes(marker),marker);

  const guard=sidebar.indexOf('__TAURI_INTERNALS__');
  assert.ok(sidebar.indexOf("import('@tauri-apps/api/core')")>guard);
  assert.ok(sidebar.indexOf("import('@tauri-apps/api/window')")>guard);
}

console.log('LXC_SHARED_FRONTEND_ENTRY=PRESERVED');
console.log('TAURI_WINDOW_STATIC_IMPORT=REMOVED');
console.log('TAURI_CORE_STATIC_IMPORT=REMOVED');
console.log('TAURI_RUNTIME_GUARD='+(hasIconPolicy?'PASSED':'NOT_REQUIRED_NO_NATIVE_ICON_POLICY'));
console.log('MACOS_DYNAMIC_ICON_POLICY='+(hasIconPolicy?'PRESERVED':'NOT_PRESENT_IN_LOCAL_STACK'));
console.log('LXC_TAURI_METADATA_CRASH_GUARD=PASSED');
