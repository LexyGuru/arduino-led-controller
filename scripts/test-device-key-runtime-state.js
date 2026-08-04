#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const rust = fs.readFileSync(
  'desktop-tauri/src-tauri/src/lib.rs',
  'utf8'
);
const controller = fs.readFileSync(
  'desktop-tauri/src/hooks/useController.ts',
  'utf8'
);
const types = fs.readFileSync(
  'desktop-tauri/src/types/index.ts',
  'utf8'
);

assert.match(
  rust,
  /#\[serde\(skip_serializing, default\)\]\s+arduino_api_key: String/
);
assert.match(
  rust,
  /fn config_runtime_value\(config: &Config\) -> Result<Value, String>/
);
assert.match(
  rust,
  /"arduinoApiKeyConfigured"\.to_string\(\)/
);
assert.match(
  rust,
  /Value::Bool\(!config\.arduino_api_key\.trim\(\)\.is_empty\(\)\)/
);
assert.match(
  rust,
  /fn load_config\(state: State<AppState>\) -> Result<Value, String>/
);
assert.match(
  rust,
  /config_runtime_value\(&config\)/
);
assert.doesNotMatch(
  rust,
  /object\.insert\(\s*"arduinoApiKey"\.to_string\(\)/
);

assert.match(types, /arduinoApiKeyConfigured: boolean/);
assert.match(controller, /arduinoApiKeyConfigured: false/);
assert.match(
  controller,
  /config\.arduinoApiKeyConfigured \|\|\s+inlineKeyReady/
);
assert.match(
  controller,
  /!merged\s+\.arduinoApiKeyConfigured/
);

console.log(
  'OK: az X-Device-Key továbbra sem kerül connection.json fájlba'
);
console.log(
  'OK: a frontend csak a Keychain-konfiguráltság jelzőjét kapja'
);
console.log(
  'OK: újraindítás után a mentett Device-Key kész kapcsolatnak számít'
);
