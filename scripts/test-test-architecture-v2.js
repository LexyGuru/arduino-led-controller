#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifest = JSON.parse(fs.readFileSync('scripts/test-suite-v2.json', 'utf8'));
const release = JSON.parse(fs.readFileSync('release-versions.json', 'utf8'));
const scripts = pkg.scripts || {};

assert.equal(scripts.test, 'node scripts/run-test-suite-v2.js default');
assert.ok(scripts['test:legacy-all'], 'legacy full test chain must be preserved');
assert.equal(scripts['test:current'], 'node scripts/run-test-suite-v2.js current');
assert.equal(scripts['test:regression'], 'node scripts/run-test-suite-v2.js regression');
assert.equal(scripts['test:history'], 'node scripts/run-test-suite-v2.js history');
assert.equal(scripts['test:extended'], 'node scripts/run-test-suite-v2.js extended');
assert.equal(scripts['test:inventory'], 'node scripts/run-test-suite-v2.js inventory');
assert.equal(scripts['test:architecture-v2'], 'node scripts/test-test-architecture-v2.js');
assert.equal(
  scripts['test:architecture-preflight-v2'],
  'node scripts/test-test-architecture-v2-manifest-preflight.js package.json scripts/test-suite-v2.json'
);

for (const group of ['current', 'regression', 'historyAudit']) {
  assert.ok(Array.isArray(manifest[group]) && manifest[group].length > 0, `${group} must be populated`);
  for (const alias of manifest[group]) {
    assert.ok(scripts[alias], `${group} alias missing: ${alias}`);
  }
}

const defaultCommand = scripts.test;
assert.doesNotMatch(defaultCommand, /beta\d+/i);
assert.doesNotMatch(defaultCommand, /alpha\d+/i);
assert.doesNotMatch(defaultCommand, /legacy-all/);

for (const alias of manifest.current) {
  assert.ok(!manifest.historyAudit.includes(alias), `current/history collision: ${alias}`);
}
for (const alias of manifest.regression) {
  assert.ok(!manifest.historyAudit.includes(alias), `regression/history collision: ${alias}`);
}

const version = fs.readFileSync('VERSION', 'utf8').trim();
const beta = version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);
const stable = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
assert.ok(beta || stable, 'VERSION must be a supported Beta or Stable semantic version');

const expectedChannel = beta ? 'beta' : 'stable';
assert.equal(release.application, version);
assert.equal(release.channel, expectedChannel);

if (beta) {
  const prefix = `${beta[1]}.${beta[2]}.${beta[3]}-beta.`;
  for (const file of manifest.versionDrivenContractFiles) {
    assert.ok(fs.existsSync(file), `version-driven contract file missing: ${file}`);
    const text = fs.readFileSync(file, 'utf8');
    const versions = text.match(/\b\d+\.\d+\.\d+-beta\.\d+\b/g) || [];
    const stale = versions.filter((item) => item.startsWith(prefix) && item !== version);
    assert.deepEqual(stale, [], `${file}: stale application version hardcode(s): ${stale.join(', ')}`);
  }
} else {
  for (const file of manifest.versionDrivenContractFiles) {
    assert.ok(fs.existsSync(file), `version-driven contract file missing: ${file}`);
  }
}

const runner = fs.readFileSync('scripts/run-test-suite-v2.js', 'utf8');
assert.match(runner, /const betaMatch = currentVersion\.match/);
assert.match(runner, /const stableMatch = currentVersion\.match/);
assert.match(runner, /expectedChannel = betaMatch \? 'beta' : 'stable'/);

const historyTest = fs.readFileSync('scripts/test-release-history-archive-v334.js', 'utf8');
assert.doesNotMatch(historyTest, /assert\.equal\(read\('VERSION'\)/);
assert.doesNotMatch(historyTest, /CURRENT_RELEASE_SEPARATED_FROM_HISTORY/);
assert.doesNotMatch(
  historyTest,
  /\[['"]docs\/v5\/BETA\d+_RELEASE_NOTES\.md['"]\s*,\s*['"]\d+\.\d+\.\d+-beta\.\d+['"]\]/,
  'history audit must not contain a manual filename -> version map'
);
assert.match(historyTest, /fs\.readdirSync\(DOC_DIR\)/);
assert.match(historyTest, /CURRENT_RELEASE_EXCLUDED_FROM_HISTORY/);
assert.match(historyTest, /HISTORICAL_RELEASE_SELF_IDENTITY=PASSED/);

const docsTest = fs.readFileSync('scripts/test-v5-documentation-status.js', 'utf8');
assert.match(docsTest, /const version=read\('VERSION'\)\.trim\(\)|const version = read\('VERSION'\)\.trim\(\)/);
assert.match(docsTest, /release-versions\.json/);

console.log(`TEST_ARCHITECTURE_V2_RUNTIME=${version}:${expectedChannel}`);
console.log('TEST_ARCHITECTURE_V2_MANIFEST=PASSED');
console.log('DEFAULT_TEST_CURRENT_REGRESSION_ONLY=PASSED');
console.log('LEGACY_FULL_CHAIN_PRESERVED=PASSED');
console.log('HISTORY_TESTS_EXCLUDED_FROM_DEFAULT=PASSED');
console.log('CURRENT_VERSION_CONTRACTS_CHANNEL_AWARE=PASSED');
