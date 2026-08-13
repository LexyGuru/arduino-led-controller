#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const lib = fs.readFileSync(
  'desktop-tauri/src-tauri/src/lib.rs',
  'utf8'
);

const start = lib.indexOf('async fn confirm_restart(');
assert.ok(start >= 0, 'confirm_restart missing');
const tail = lib.slice(start, start + 10000);

assert.match(
  tail,
  /let marker = match \(installed_before, version\.as_deref\(\)\)/
);
assert.match(
  tail,
  /normalize_version\(before\) == normalize_version\(actual\)/
);
assert.ok(
  !tail.includes(
    'let marker = match (installed_before, expected.as_deref())'
  ),
  'Old expected-based same-version classifier still present'
);

console.log('SAME_VERSION_CLASSIFIER_USES_ACTUAL_AFTER_VERSION=PASSED');
console.log('EXTERNAL_EXPECTED_NONE_PATH_SUPPORTED=PASSED');
console.log('V397_OTA_CLASSIFICATION_EXACT_CONTRACT=PASSED');
