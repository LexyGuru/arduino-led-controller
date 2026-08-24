#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const { spawnSync } = require('node:child_process');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('scripts/test-suite-v2.json', 'utf8'));
const release = JSON.parse(fs.readFileSync('release-versions.json', 'utf8'));
const __v774AppBeta = /-beta\.\d+$/.test(release.application);
const __v774FirmwareBeta = /-beta\.\d+$/.test(release.firmware);
const mode = process.argv[2] || 'default';
const scripts = pkg.scripts || {};
const currentVersion = fs.readFileSync('VERSION', 'utf8').trim();

const betaMatch = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);
const stableMatch = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
const currentMatch = betaMatch || stableMatch;

if (!currentMatch) {
  throw new Error(`Unsupported VERSION: ${currentVersion}`);
}

const expectedChannel = betaMatch ? 'beta' : 'stable';
if (release.application !== currentVersion || release.channel !== expectedChannel) {
  throw new Error(
    `VERSION/release channel mismatch: VERSION=${currentVersion} ` +
    `release.application=${release.application} release.channel=${release.channel}`
  );
}

const betaFamilyPrefix = betaMatch
  ? `${betaMatch[1]}.${betaMatch[2]}.${betaMatch[3]}-beta.`
  : null;
const historyPatterns = manifest.historyAliasPatterns.map((value) => new RegExp(value));

function legacyAliases() {
  const command = scripts['test:legacy-all'];
  if (!command) return [];
  return [...command.matchAll(/npm run (test:[A-Za-z0-9:_-]+)/g)].map((m) => m[1]);
}

function isExplicitHistory(alias) {
  if (manifest.current.includes(alias) || manifest.regression.includes(alias)) return false;
  return historyPatterns.some((pattern) => pattern.test(alias));
}

function commandFiles(alias) {
  const command = scripts[alias] || '';
  return [...command.matchAll(/(?:node|bash)\s+([^\s"';&|]+\.(?:js|mjs|cjs|sh))/g)]
    .map((m) => m[1])
    .filter((p) => fs.existsSync(p));
}

function hasStaleApplicationVersion(alias) {
  if (!betaFamilyPrefix) return null;

  for (const path of commandFiles(alias)) {
    const text = fs.readFileSync(path, 'utf8');
    const matches = text.match(/\b\d+\.\d+\.\d+-beta\.\d+\b/g) || [];
    for (const found of matches) {
      if (found.startsWith(betaFamilyPrefix) && found !== currentVersion) {
        return { path, found };
      }
    }
  }
  return null;
}

function uniq(values) {
  return [...new Set(values)];
}

function ensureAliases(aliases) {
  for (const alias of aliases) {
    if (!scripts[alias]) throw new Error(`Missing npm test alias: ${alias}`);
  }
}

function runAliases(aliases, label, options = {}) {
  ensureAliases(aliases);
  console.log(`\n===== TEST ARCHITECTURE V2 :: ${label} (${aliases.length}) =====`);
  console.log(`TEST_SUITE_RUNTIME_IDENTITY=${currentVersion}:${expectedChannel}`);
  let ran = 0;
  let skipped = 0;
  for (const alias of aliases) {
    const stale = options.skipStale ? hasStaleApplicationVersion(alias) : null;
    if (stale) {
      skipped += 1;
      console.log(`HISTORY_AUTO_SKIP ${alias} -> ${stale.path} contains stale ${stale.found}`);
      continue;
    }

    console.log(`\n--- ${alias} ---`);
    const result = spawnSync('npm', ['run', alias], {
      stdio: 'inherit',
      env: process.env
    });
    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
    ran += 1;
  }
  console.log(
    `TEST_SUITE_${label.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}=PASSED ` +
    `ran=${ran} skipped=${skipped}`
  );
}

const current = uniq(manifest.current);
const regression = uniq(manifest.regression);
const history = uniq(manifest.historyAudit);
const legacy = uniq(legacyAliases());
const extended = legacy.filter((alias) =>
  alias !== 'test:legacy-all' &&
  !isExplicitHistory(alias) &&
  !current.includes(alias) &&
  !regression.includes(alias)
);

switch (mode) {
  case 'current':
    runAliases(current, 'current');
    break;
  case 'regression':
    runAliases(regression, 'regression', { skipStale: true });
    break;
  case 'history':
    runAliases(history, 'history-audit');
    break;
  case 'extended':
    runAliases([...current, ...regression, ...extended], 'extended-current-regression', { skipStale: true });
    break;
  case 'inventory':
    console.log(JSON.stringify({
      version: currentVersion,
      channel: expectedChannel,
      current,
      regression,
      historyAudit: history,
      legacyCount: legacy.length,
      extendedAdditionalCount: extended.length,
      explicitHistoricalFromLegacy: legacy.filter(isExplicitHistory)
    }, null, 2));
    break;
  case 'default':
    runAliases(current, 'current');
    runAliases(regression, 'regression', { skipStale: true });
    console.log('DEFAULT_NPM_TEST_CURRENT_PLUS_REGRESSION=PASSED');
    break;
  default:
    throw new Error(`Unknown test suite mode: ${mode}`);
}
