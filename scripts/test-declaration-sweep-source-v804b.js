#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const body=fs.readFileSync('scripts/test-final-language-hardening-v804.js','utf8');
assert.doesNotMatch(body,/locale\.d\.ts/);
assert.match(body,/locale\.ts/);
assert.match(body,/jsonIntegrity\.ts/);
console.log('V804J_TYPED_I18N_MODULE_SOURCE_CONTRACT=PASSED');

assert.match(body,/localeImplementations/);
assert.match(body,/\['desktop-tauri\/src\/i18n\/locale\.ts'\]/);
assert.doesNotMatch(body,/assert\.deepEqual\(localResolvers,\[\]\)/);
console.log('V804J_CANONICAL_LOCALE_SWEEP_SOURCE_CONTRACT=PASSED');
