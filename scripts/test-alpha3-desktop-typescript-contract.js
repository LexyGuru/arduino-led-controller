'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(
    path.join(ROOT, relativePath),
    'utf8'
  );
}

function main() {
  const preflight = read(
    'desktop-tauri/src/components/v5/V5PreflightPanel.tsx'
  );
  const mainSource = read(
    'desktop-tauri/src/main.tsx'
  );
  const viteEnvironment = read(
    'desktop-tauri/src/vite-env.d.ts'
  );

  assert.match(
    preflight,
    /item\.code === null \|\|\s*item\.code === undefined/
  );
  assert.match(
    preflight,
    /const code =[\s\S]*String\(\s*item\.code\s*\)/
  );
  assert.match(
    preflight,
    /\{code !== null && \(/
  );
  assert.doesNotMatch(
    preflight,
    /\{item\.code && \(/
  );

  assert.match(
    viteEnvironment,
    /<reference types="vite\/client" \/>/
  );
  assert.match(
    viteEnvironment,
    /VITE_ALLOW_PERSISTENT_BEARER\?:/
  );
  assert.match(
    viteEnvironment,
    /interface ImportMeta/
  );

  assert.match(
    mainSource,
    /type CreateDesktopApiOptions/
  );
  assert.match(
    mainSource,
    /const desktopInvoke:\s*CreateDesktopApiOptions/
  );
  assert.match(
    mainSource,
    /Parameters<\s*typeof invoke\s*>\[1\]/
  );
  assert.match(
    mainSource,
    /invoke:\s*desktopInvoke/
  );
  assert.doesNotMatch(
    mainSource,
    /invoke:\s*tauriAvailable\s*\?\s*invoke/
  );

  console.log(
    'OK: V5 preflight unknown mező ReactNode-kompatibilis'
  );
  console.log(
    'OK: Vite ImportMetaEnv típusdeklaráció elérhető'
  );
  console.log(
    'OK: Tauri invoke adapter illeszkedik a desktop API szerződéshez'
  );
}

try {
  main();
} catch (error) {
  console.error(`HIBA: ${error.message}`);
  process.exitCode = 1;
}
