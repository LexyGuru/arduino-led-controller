#!/usr/bin/env node
'use strict';

const fs = require('node:fs');

const packagePath = process.argv[2] || 'package.json';
const manifestPath = process.argv[3] || 'scripts/test-suite-v2.json';

const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const scripts = pkg.scripts || {};

const aliases = [...new Set([
  ...(manifest.current || []),
  ...(manifest.regression || []),
  ...(manifest.historyAudit || [])
])];

const missing = aliases.filter((alias) => !scripts[alias]);
if (missing.length) {
  console.error('TEST_ARCHITECTURE_V2_MANIFEST_ALIAS_PREFLIGHT=FAILED');
  for (const alias of missing) console.error(`MISSING_NPM_ALIAS=${alias}`);
  process.exit(1);
}

console.log(`TEST_ARCHITECTURE_V2_MANIFEST_ALIAS_PREFLIGHT=PASSED count=${aliases.length}`);
