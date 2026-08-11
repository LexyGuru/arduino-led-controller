#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');

const CURRENT_APP_VERSION = fs.readFileSync('VERSION', 'utf8').trim();
const CURRENT_BETA_DOC_NUMBER =
  CURRENT_APP_VERSION.match(/-beta\.(\d+)$/)?.[1];

assert.ok(
  CURRENT_BETA_DOC_NUMBER,
  'Current Beta document number cannot be derived',
);

const CURRENT_RELEASE_DOCS = [
  `BETA${CURRENT_BETA_DOC_NUMBER}_INSTALLATION_GUIDE.md`,
  `BETA${CURRENT_BETA_DOC_NUMBER}_RELEASE_NOTES.md`,
  `BETA${CURRENT_BETA_DOC_NUMBER}_RELEASE_CHECKLIST.md`,
];

const CURRENT_RELEASE_NOTES_PATH =
  `docs/v5/BETA${CURRENT_BETA_DOC_NUMBER}_RELEASE_NOTES.md`;

const workflow = fs.readFileSync(
  '.github/workflows/beta-release.yml',
  'utf8',
);

/* Current application release assets */
for (const doc of CURRENT_RELEASE_DOCS) {
  assert.ok(
    workflow.includes(`cp docs/v5/${doc} release-assets/`),
    `copy missing ${doc}`,
  );
  assert.ok(
    workflow.includes(`test -f release-assets/${doc}`),
    `verify missing ${doc}`,
  );
}

assert.match(workflow, /files:\s*release-assets\/\*/);
assert.ok(
  workflow.includes(`body_path: ${CURRENT_RELEASE_NOTES_PATH}`),
  `current release body_path missing: ${CURRENT_RELEASE_NOTES_PATH}`,
);
assert.match(workflow, /prerelease:\s*true/);
assert.match(workflow, /make_latest:\s*false/);

/* Historical release documents must be removed from current release-assets. */
assert.match(
  workflow,
  /Remove stale historical release documentation assets/,
);
assert.match(
  workflow,
  /for generation in 1 2 3 4 5 6 7 8; do/,
);
assert.match(
  workflow,
  /for kind in INSTALLATION_GUIDE RELEASE_NOTES RELEASE_CHECKLIST; do/,
);
assert.match(
  workflow,
  /name="BETA\$\{generation\}_\$\{kind\}\.md"/,
);

const previousBetaPattern = new RegExp(
  `BETA(?:${Array.from(
    { length: Number(CURRENT_BETA_DOC_NUMBER) - 1 },
    (_, i) => i + 1,
  ).join('|')})_(?:INSTALLATION_GUIDE|RELEASE_NOTES|RELEASE_CHECKLIST)\\.md`,
);

/* Current workflow must not explicitly publish previous-generation docs. */
for (const line of workflow.split(/\r?\n/)) {
  if (
    line.includes('cp docs/v5/BETA') ||
    line.includes('test -f release-assets/BETA') ||
    line.includes('body_path: docs/v5/BETA')
  ) {
    assert.doesNotMatch(
      line,
      previousBetaPattern,
      `historical doc leaked into current release surface: ${line.trim()}`,
    );
  }
}

/* Release-doc copy lines must use the same indentation as release-versions. */
const lines = workflow.split(/\r?\n/);
const referenceLine = lines.find((line) =>
  line.includes('cp release-versions.json release-assets/'),
);
assert.ok(referenceLine, 'release-versions copy missing');

const indent = (referenceLine.match(/^(\s*)/) || [])[1];

for (const needle of CURRENT_RELEASE_DOCS.map(
  (doc) => `cp docs/v5/${doc} release-assets/`,
)) {
  const line = lines.find((candidate) => candidate.trim() === needle);
  assert.ok(line, `${needle} missing`);
  assert.equal(
    (line.match(/^(\s*)/) || [])[1],
    indent,
    `${needle} indentation mismatch`,
  );
}

/* Cleanup must execute before publication. */
const cleanupStart = lines.findIndex((line) =>
  line.includes('Remove stale historical release documentation assets'),
);
const publishStart = lines.findIndex(
  (line, index) =>
    index > cleanupStart &&
    line.includes('Publish or update prerelease'),
);

assert.ok(
  cleanupStart >= 0 && publishStart > cleanupStart,
  'cleanup/publish order invalid',
);

const cleanup = lines.slice(cleanupStart, publishStart).join('\n');

/* Cleanup must be generation-driven, not hardcoded to current Beta. */
assert.doesNotMatch(
  cleanup,
  new RegExp(`name="BETA${CURRENT_BETA_DOC_NUMBER}_`),
);
assert.doesNotMatch(
  cleanup,
  new RegExp(`for name in BETA${CURRENT_BETA_DOC_NUMBER}_`),
);

console.log('CURRENT_WORKFLOW_DOC_ASSET_COPY=PASSED');
console.log('CURRENT_WORKFLOW_DOC_ASSET_VERIFY=PASSED');
console.log('CURRENT_WORKFLOW_RELEASE_BODY_PATH=PASSED');
console.log('HISTORICAL_WORKFLOW_DOC_CLEANUP=PASSED');
console.log('CURRENT_WORKFLOW_SHELL_INDENTATION=PASSED');
console.log('WORKFLOW_RELEASE_ASSETS=PASSED');
