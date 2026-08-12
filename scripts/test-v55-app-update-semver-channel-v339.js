#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const hook = fs.readFileSync('desktop-tauri/src/hooks/useAppUpdateCenter.ts', 'utf8');
const rust = fs.readFileSync('desktop-tauri/src-tauri/src/lib.rs', 'utf8');
const i18n = fs.readFileSync('desktop-tauri/src/i18n/index.tsx', 'utf8');

function versionParts(value) {
  const normalized = String(value).trim().replace(/^v/i, '');
  const [core, pre = ''] = normalized.split('-', 2);
  return {
    core: core.split('.').map((part) => Number(part) || 0),
    pre: pre.toLowerCase()
  };
}

function compareVersions(left, right) {
  const a = versionParts(left);
  const b = versionParts(right);
  const length = Math.max(a.core.length, b.core.length);

  for (let index = 0; index < length; index += 1) {
    const delta = (a.core[index] ?? 0) - (b.core[index] ?? 0);
    if (delta !== 0) return delta;
  }

  if (a.pre === b.pre) return 0;
  if (!a.pre) return 1;
  if (!b.pre) return -1;

  const parsePre = (value) => {
    const match = value.match(/^([a-z]+)[.-]?(\d+)?/);
    return {
      label: match?.[1] ?? value,
      number: Number(match?.[2] ?? 0)
    };
  };

  const rank = (label) =>
    label === 'alpha' ? 0 : label === 'beta' ? 1 : label === 'rc' ? 2 : 3;

  const pa = parsePre(a.pre);
  const pb = parsePre(b.pre);
  const rankDelta = rank(pa.label) - rank(pb.label);
  if (rankDelta !== 0) return rankDelta;
  return pa.number - pb.number;
}

assert.ok(compareVersions('5.5.0-beta.2', '5.0.0-beta.10') > 0);
assert.ok(compareVersions('5.0.0-beta.10', '5.5.0-beta.2') < 0);
assert.ok(compareVersions('5.5.0-beta.2', '5.5.0-beta.2') > 0);
assert.ok(compareVersions('5.5.0', '5.5.0-beta.99') > 0);
assert.equal(compareVersions('v5.5.0-beta.2', '5.5.0-beta.2'), 0);

assert.ok(rust.includes('fn compare_app_versions('));
assert.ok(rust.includes('.max_by(|left, right|'));
assert.ok(rust.includes('compare_app_versions(&app_release.version, env!("CARGO_PKG_VERSION")).is_gt()'));
assert.doesNotMatch(
  rust,
  /app_update_available\s*=\s*normalize_version\(env!\("CARGO_PKG_VERSION"\)\)\s*!=/
);

assert.ok(hook.includes('const semanticComparison ='));
assert.ok(hook.includes('semanticComparison > 0'));
assert.ok(hook.includes('const displayedLatest ='));
assert.ok(hook.includes('setLatestVersion(displayedLatest);'));
assert.ok(hook.includes('setDownloadUrl(available ? artifact?.downloadUrl || null : null);'));
assert.ok(hook.includes('setReleaseUrl(available ? artifact?.releaseUrl || null : null);'));

for (const key of [
  'appUpdate.channel',
  'appUpdate.checkError',
  'appUpdate.sidebarAvailable'
]) {
  const hits = [...i18n.matchAll(new RegExp(`'${key.replace('.', '\\.')}'\\s*:\\s*'([^']+)'`, 'g'))];
  assert.equal(hits.length, 3, `${key}: HU/EN/DE entries expected`);
  for (const hit of hits) {
    assert.doesNotMatch(hit[1], /(^|[^{])\{[a-zA-Z]+}/, `${key}: single-brace placeholder`);
  }
}

assert.match(i18n, /'appUpdate\.channel':\s*'Csatorna: \{\{channel}}'/);
assert.match(i18n, /'appUpdate\.channel':\s*'Channel: \{\{channel}}'/);
assert.match(i18n, /'appUpdate\.channel':\s*'Kanal: \{\{channel}}'/);

console.log('APP_UPDATE_SEMVER_DOWNGRADE_GUARD=PASSED');
console.log('APP_UPDATE_RELEASE_MAX_SEMVER_SELECTION=PASSED');
console.log('APP_UPDATE_FRONTEND_BACKEND_FLAG_GUARD=PASSED');
console.log('APP_UPDATE_DISPLAY_LATEST_NORMALIZATION=PASSED');
console.log('APP_UPDATE_I18N_PLACEHOLDERS=PASSED');
console.log('V55_APP_UPDATE_SEMVER_CHANNEL_FIX_V339_CONTRACT=PASSED');
