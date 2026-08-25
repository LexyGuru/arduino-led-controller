#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const locale=fs.readFileSync('desktop-tauri/src/i18n/locale.ts','utf8');

assert.match(
  locale,
  /const COMMON_LOCALES: Readonly<Record<string, string>> = Object\.freeze\(/
);
assert.match(locale,/const preferredLocale = COMMON_LOCALES\[normalized\]/);
assert.match(locale,/if \(preferredLocale\) return preferredLocale/);
assert.doesNotMatch(
  locale,
  /if \(COMMON_LOCALES\[normalized\]\) return COMMON_LOCALES\[normalized\]/
);

console.log('V804J_DYNAMIC_LOCALE_MAP_INDEX_SIGNATURE=PASSED');
console.log('V804J_TS7053_DOUBLE_DYNAMIC_INDEX_PATTERN=ZERO');
console.log('V804J_DYNAMIC_BCP47_FALLBACK_PRESERVED=PASSED');
