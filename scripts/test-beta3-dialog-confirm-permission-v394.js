#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const capDir = path.join(
  'desktop-tauri',
  'src-tauri',
  'capabilities'
);

const files = fs.readdirSync(capDir)
  .filter((name) => name.endsWith('.json'));

assert.ok(files.length > 0, 'No Tauri capability JSON files found');

let confirmAllowed = false;
let messageAllowed = false;

for (const name of files) {
  const file = path.join(capDir, name);
  const value = JSON.parse(fs.readFileSync(file, 'utf8'));
  const permissions = Array.isArray(value.permissions)
    ? value.permissions
    : [];

  confirmAllowed ||= permissions.includes('dialog:allow-confirm');
  messageAllowed ||= permissions.includes('dialog:allow-message');
}

assert.equal(confirmAllowed, true, 'dialog:allow-confirm missing');
assert.equal(messageAllowed, true, 'dialog:allow-message missing');

const cargo = fs.readFileSync(
  'desktop-tauri/src-tauri/src/lib.rs',
  'utf8'
);
assert.match(
  cargo,
  /plugin\(tauri_plugin_dialog::init\(\)\)/
);

console.log('TAURI_DIALOG_PLUGIN_INITIALIZED=PASSED');
console.log('DIALOG_ALLOW_MESSAGE=PASSED');
console.log('DIALOG_ALLOW_CONFIRM=PASSED');
console.log('V394_DIALOG_CONFIRM_PERMISSION_CONTRACT=PASSED');
