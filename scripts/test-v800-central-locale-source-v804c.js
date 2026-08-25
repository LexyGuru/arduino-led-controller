#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const body=fs.readFileSync('scripts/test-language-pack-architecture-v800.js','utf8');

assert.ok(
  body.includes("firmwarePage.includes(\"import { localeForLanguage } from '../i18n/runtime';\")")
);
assert.ok(
  body.includes("!firmwarePage.includes('function localeForLanguage(language: string)')")
);
assert.ok(
  body.includes("runtime.includes(\"export { localeForLanguage } from './locale';\")")
);
assert.ok(
  !body.includes("assert.ok(firmwarePage.includes('function localeForLanguage(language: string)'))")
);

console.log('V804J_V800_CENTRAL_LOCALE_ARCHITECTURE_SOURCE_CONTRACT=PASSED');
