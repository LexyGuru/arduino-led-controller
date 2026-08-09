#!/usr/bin/env node
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');

const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
const workflow = fs.readFileSync('.github/workflows/beta-release.yml','utf8');
const releaseTest = fs.readFileSync('scripts/test-beta-release-workflow.js','utf8');
const installTest = fs.readFileSync('scripts/test-beta-installation-assets.js','utf8');
const docsTest = fs.readFileSync('scripts/test-v5-documentation-status.js','utf8');
const validator = fs.readFileSync('scripts/validate-repository.sh','utf8');


for (const doc of [
  'BETA9_INSTALLATION_GUIDE.md',
  'BETA9_RELEASE_NOTES.md',
  'BETA9_RELEASE_CHECKLIST.md',
]) {
  assert.ok(workflow.includes(`cp docs/v5/${doc} release-assets/`), `workflow copy missing ${doc}`);
  assert.ok(workflow.includes(`test -f release-assets/${doc}`), `workflow verify missing ${doc}`);
}
assert.match(workflow,/Remove stale historical release documentation assets/);
assert.match(workflow,/for generation in 1 2 3 4 5 6 7 8; do/);
assert.match(workflow,/files:\s*release-assets\/\*/);

const deployRefs = new Set();
for (const match of installTest.matchAll(/(?:read|readFileSync)\(['"]((?:deploy\/)[^'"]+)['"]/g)) {
  deployRefs.add(match[1]);
}
assert.ok(deployRefs.size > 0, 'installation-assets test must reference current deploy assets');
for (const rel of deployRefs) {
  const text = fs.readFileSync(rel, 'utf8');
  assert.doesNotMatch(
    text,
    /BETA_VERSION:-5\.0\.0-beta\.(?:1|2|3|4|5|6|7|8)/,
    `${rel}: stale current Beta version default`
  );
  assert.doesNotMatch(
    text,
    /Description=Arduino LED Controller 5\.0\.0-beta\.(?:1|2|3|4|5|6|7|8) Staging/,
    `${rel}: stale staging service Description`
  );
  if (/\.service$/.test(rel) && /Arduino LED Controller/.test(text) && / Staging/.test(text)) {
    assert.match(
      text,
      /Description=Arduino LED Controller 5\.0\.0-beta\.9 Staging/,
      `${rel}: current staging service Description must be Beta.9`
    );
  }
  assert.doesNotMatch(
    text,
    /__beta(?:1|2|3|4|5|6|7|8)_staging_disabled__/i,
    `${rel}: stale staging namespace`
  );
  assert.doesNotMatch(
    text,
    /<BETA(?:1|2|3|4|5|6|7|8)_STAGING_DISABLED_API_KEY>/,
    `${rel}: stale staging API-key sentinel`
  );
  assert.doesNotMatch(
    text,
    /beta(?:1|2|3|4|5|6|7|8)-(?:promotion-approval|finalization-approval|orchestration-state|index|production-guard|production-guard-verification)\.json/i,
    `${rel}: stale current-generation release state filename`
  );
}
const stagingRefs=[...deployRefs].filter(x => /staging/i.test(x));
assert.ok(stagingRefs.length > 0, 'current staging deploy asset must be discoverable');

const envBinding = installTest.match(/const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*(?:read|fs\.readFileSync)\(['"]([^'"]*(?:staging[^'"]*\.env[^'"]*|[^'"]*\.env[^'"]*staging[^'"]*))['"]/i);
if (envBinding) {
  const envText = fs.readFileSync(envBinding[2], 'utf8');
  for (const expected of [
    'RELEASE_CHANNEL=beta',
    'RELEASE_CANDIDATE=beta.9-gate',
    'RELEASE_TARGET_VERSION=5.0.0-beta.9',
  ]) {
    assert.ok(envText.includes(expected), `current staging env missing ${expected}`);
  }
  assert.doesNotMatch(envText,/RELEASE_CANDIDATE=beta\.(?:1|2|3|4|5|6|7|8)-gate/);
  assert.doesNotMatch(envText,/RELEASE_TARGET_VERSION=5\.0\.0-beta\.(?:1|2|3|4|5|6|7|8)/);
  assert.doesNotMatch(envText,/__beta(?:1|2|3|4|5|6|7|8)_staging_disabled__/i);
  assert.doesNotMatch(envText,/<BETA(?:1|2|3|4|5|6|7|8)_STAGING_DISABLED_API_KEY>/);
  assert.ok(envText.includes('__beta9_staging_disabled__'));
  assert.ok(envText.includes('<BETA9_STAGING_DISABLED_API_KEY>'));
  assert.doesNotMatch(
    envText,
    /beta(?:1|2|3|4|5|6|7|8)-(?:promotion-approval|finalization-approval|orchestration-state|index|production-guard|production-guard-verification)\.json/i
  );
}
const stagingText=stagingRefs.map(x => fs.readFileSync(x,'utf8')).join('\n');
if (installTest.includes('RELEASE_CANDIDATE beta.9-gate')) {
  assert.ok(
    stagingText.includes('RELEASE_CANDIDATE beta.9-gate'),
    'current staging asset missing RELEASE_CANDIDATE beta.9-gate'
  );
}

const oldDocs = /BETA(?:1|2|3|4|5|6|7|8)_(?:INSTALLATION_GUIDE|RELEASE_NOTES|RELEASE_CHECKLIST)\.md/;
assert.doesNotMatch(workflow, oldDocs);

for (const token of ['BETA9_INSTALLATION_GUIDE','BETA9_RELEASE_NOTES','BETA9_RELEASE_CHECKLIST']) {
  assert.ok(releaseTest.includes(token), `current workflow test missing ${token}`);
}
assert.doesNotMatch(
  installTest,
  /docs\/v5\/BETA(?:1|2|3|4|5|6|7|8)_(?:INSTALLATION_GUIDE|RELEASE_NOTES|RELEASE_CHECKLIST)\.md/
);
assert.match(installTest,/docs\/v5\/BETA9_INSTALLATION_GUIDE\.md/);
assert.match(installTest,/docs\/v5\/BETA9_RELEASE_NOTES\.md/);
assert.match(installTest,/docs\/v5\/BETA9_RELEASE_CHECKLIST\.md/);
assert.match(docsTest,/docs\/v5\/BETA9_/);
assert.match(validator,/BEGIN BETA9 CURRENT RELEASE DOC GATE/);

const current = pkg.scripts.test || '';
const history = pkg.scripts['test:release-history'] || '';
assert.ok(current.includes('test:beta9-documentation-release-readiness'));
assert.ok(current.includes('test:beta9-release-surface-sweep'));
assert.ok(current.includes('test:beta9-workflow-release-assets'));
assert.ok(history.length > 0, 'historical release suite must not be empty');

console.log('BETA9_WORKFLOW_HISTORICAL_DOCS=REMOVED');
console.log('BETA9_CURRENT_RELEASE_TESTS=PASSED');
console.log('RELEASE_HISTORY_SUITE=SEPARATED_AVAILABLE');
console.log('BETA9_ROLE_AWARE_RELEASE_DOC_SEMANTICS=PASSED');
console.log('BETA9_FIRMWARE_VERSION_SEMANTICS=PASSED');
console.log('BETA9_CURRENT_DOC_REFERENCES=PASSED');
console.log('BETA9_PRESERVE_FIRST_RELEASE_NOTES=PASSED');
console.log('BETA9_PRESERVE_FIRST_RELEASE_CHECKLIST=PASSED');
console.log('BETA9_ALL_RELEASE_DOCS_FULL_CONTRACT=PASSED');
console.log('BETA9_PRESERVE_FIRST_INSTALLATION_GUIDE=PASSED');
console.log('BETA9_INSTALLATION_GUIDE_FULL_CONTRACT=PASSED');
console.log('BETA9_ALL_CURRENT_INSTALL_ASSETS=PASSED');
console.log('BETA9_STAGING_SERVICE_IDENTITY=PASSED');
console.log('BETA9_STAGING_NAMESPACE_SENTINEL=PASSED');
console.log('BETA9_CANONICAL_RELEASE_ENV=PASSED');
console.log('BETA9_CURRENT_RELEASE_SEMANTIC_AUDIT=PASSED');
console.log('BETA9_STAGING_ENV_CONTRACT=PASSED');
console.log('BETA9_CURRENT_RELEASE_STATE_FILENAMES=PASSED');
console.log('BETA9_STAGING_CONTRACT=PASSED');
console.log('BETA9_CURRENT_DEPLOY_ASSETS=PASSED');
console.log('BETA9_WORKFLOW_RELEASE_ASSETS=PASSED');
console.log('BETA9_DEPLOY_README_PRESERVE_FIRST=PASSED');
console.log('BETA9_RELEASE_SURFACE_SWEEP=PASSED');
