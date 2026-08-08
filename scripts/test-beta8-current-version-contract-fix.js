#!/usr/bin/env node
const fs = require('fs');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const APP = '5.0.0-beta.9';
const FW = '5.0.0-beta.6';
const API = '1.0.0';

const versions = JSON.parse(fs.readFileSync('release-versions.json', 'utf8'));
assert(versions.application === APP, 'application version mismatch');
assert(versions.firmware === FW, 'firmware version changed');
assert(versions.directApi === API, 'Direct API version changed');

const current = fs.readFileSync('scripts/test-beta7-current-version-contract.js', 'utf8');
assert(current.includes('pkg.version,"5.0.0-beta.9"'), 'current-version package assertion not migrated');
assert(current.includes('BETA8_CURRENT_STATE.md'), 'current state test not migrated to Beta.8 file');
assert(current.includes('`5.0.0-beta.9`'), 'current state app version marker missing');
assert(current.includes('`5.0.0-beta.6`'), 'firmware marker missing from current contract');

const docStatus = fs.readFileSync('scripts/test-v5-documentation-status.js', 'utf8');
assert(docStatus.includes("'5.0.0-beta.9'"), 'documentation status app version not migrated');
assert(docStatus.includes("'4.3.0-beta.4'"), 'historical firmware documentation marker missing');

const workflow = fs.readFileSync('scripts/test-beta-release-workflow.js', 'utf8');
assert(workflow.includes('BETA8_RELEASE_NOTES.md'), 'workflow test still expects Beta.7 release notes');
assert(!workflow.includes('/docs\\/v5\\/BETA7_RELEASE_NOTES\\.md/'), 'stale Beta.7 notes assertion remains');

const readme = fs.readFileSync('README.md', 'utf8');
assert(readme.includes('| Alkalmazás | `5.0.0-beta.9` |'), 'README current app table not Beta.8');
assert(readme.includes('| Firmware | `5.0.0-beta.6` |'), 'README firmware table changed');

const state = fs.readFileSync('docs/v5/BETA8_CURRENT_STATE.md', 'utf8');
assert(state.includes('`5.0.0-beta.9`'), 'Beta.8 state app version missing');
assert(state.includes('`5.0.0-beta.6`'), 'Beta.8 state firmware version missing');
assert(state.includes('`1.0.0`'), 'Beta.8 state Direct API missing');

const historical = fs.readFileSync('scripts/test-beta6-release-package.js', 'utf8');
assert(historical.includes("versions.application, '5.0.0-beta.6'"),
  'historical Beta.6 release-package contract was modified');

console.log('BETA8_CURRENT_VERSION_CONTRACT=PASSED');
console.log('BETA8_DOCUMENTATION_STATUS=PASSED');
console.log('BETA8_WORKFLOW_NOTES_CONTRACT=PASSED');
console.log('BETA8_CURRENT_STATE=PASSED');
console.log('HISTORICAL_BETA6_CONTRACT=PRESERVED');
console.log('BETA8_V12_CONTRACT=PASSED');
