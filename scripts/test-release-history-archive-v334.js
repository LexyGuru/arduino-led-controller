#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const DOC_DIR = path.join('docs', 'v5');
const version = fs.readFileSync('VERSION', 'utf8').trim();
const currentMatch = version.match(/^(\d+)\.(\d+)\.(\d+)-beta\.(\d+)$/);

assert.ok(currentMatch, `Unsupported current Beta version: ${version}`);

const [, major, minor, , currentBeta] = currentMatch;
const currentPrefix =
  major === '5' && minor === '0'
    ? `BETA${currentBeta}`
    : `V${major}${minor}_BETA${currentBeta}`;

const releaseNotes = fs.readdirSync(DOC_DIR)
  .filter((name) =>
    /^(?:BETA\d+|V\d+_BETA\d+)_RELEASE_NOTES\.md$/.test(name)
  )
  .sort();

assert.ok(releaseNotes.length > 0, 'No versioned release notes discovered');

const historical = releaseNotes.filter(
  (name) => !name.startsWith(`${currentPrefix}_`)
);

assert.ok(
  historical.length > 0,
  `No historical release notes discovered; current prefix=${currentPrefix}`
);

for (const name of historical) {
  const file = path.join(DOC_DIR, name);
  const text = fs.readFileSync(file, 'utf8');

  assert.ok(text.trim().length > 0, `Historical document is empty: ${file}`);
  assert.match(text, /^#\s+\S/m, `Historical document has no Markdown title: ${file}`);

  const betaMatch = name.match(/(?:^BETA|_BETA)(\d+)_RELEASE_NOTES\.md$/);
  assert.ok(betaMatch, `Cannot derive Beta number from historical file: ${name}`);
  const expectedBeta = betaMatch[1];

  const semanticVersions =
    text.match(/\b\d+\.\d+\.\d+-beta\.\d+\b/g) || [];

  assert.ok(
    semanticVersions.length > 0,
    `Historical release document has no semantic Beta version: ${file}`
  );

  const selfIdentity = semanticVersions.some((item) =>
    item.endsWith(`-beta.${expectedBeta}`)
  );

  assert.ok(
    selfIdentity,
    `${file} does not self-identify as Beta.${expectedBeta}`
  );
}

console.log(`HISTORICAL_RELEASE_DOCUMENTS_DISCOVERED=${historical.length}`);
console.log(`CURRENT_RELEASE_EXCLUDED_FROM_HISTORY=${currentPrefix}`);
console.log('HISTORICAL_RELEASE_SELF_IDENTITY=PASSED');
console.log('HISTORY_AUDIT_HAS_NO_HARDCODED_RELEASE_MAP=PASSED');
