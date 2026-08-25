#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const read=p=>fs.readFileSync(p,'utf8');
const runtimePath=path.resolve('desktop-tauri/src/i18n/runtime.ts');
const runtime=fs.readFileSync(runtimePath,'utf8');
console.log(`V804J_HARDENING_TEST_CWD=${process.cwd()}`);
console.log(`V804J_HARDENING_TEST_RUNTIME=${runtimePath}`);
assert.ok(runtime.includes('const MAX_PACK_BYTES = 1024 * 1024;'),'production runtime sentinel missing');
const provider=read('desktop-tauri/src/i18n/index.tsx');
const settings=read('desktop-tauri/src/pages/SettingsPage.tsx');

for(const token of [
  'MAX_PACK_BYTES = 1024 * 1024',
  'MANIFEST_CACHE_TTL_MS = 24 * 60 * 60 * 1000',
  'assertPlaceholderParity(payload.translations)',
  'contentLength > MAX_PACK_BYTES',
  "new TextEncoder().encode(raw).byteLength > MAX_PACK_BYTES",
  'appVersionCompatible(entry.minAppVersion, entry.maxAppVersion)',
  'appVersionCompatible(payload.minAppVersion, payload.maxAppVersion)',
  'const previous = store.getItem(finalKey)',
  'else store.setItem(finalKey, previous)',
  'isLanguagePackUpdateAvailable'
]) assert.ok(runtime.includes(token),token);

assert.ok(runtime.includes('doubleKey: string | undefined'));
assert.ok(runtime.includes('singleKey: string | undefined'));
assert.ok(provider.includes('shouldRefreshLanguageManifest()'));
assert.ok(provider.includes('updateAvailable: isLanguagePackUpdateAvailable'));
assert.ok(settings.includes("t('languagePack.updateAvailable')"));
assert.ok(settings.includes("t('languagePack.update')"));

console.log('V804J_RUNTIME_HARDENING_SOURCE_CONTRACT=PASSED');
