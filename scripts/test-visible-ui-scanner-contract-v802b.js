#!/usr/bin/env node
'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');

const scanner=fs.readFileSync('scripts/test-i18n-visible-ui-hardcoded-v802.js','utf8');

for(const token of [
  'process.env.V802_TYPESCRIPT_MODULE',
  "require.resolve('typescript'",
  'ts.createSourceFile',
  'ts.isJsxText(node)',
  'ts.isJsxAttribute(node)',
  'ts.isJsxExpression(node)',
  '!ts.isJsxAttribute(node.parent)',
  'ts.isCallExpression(node)',
  'V804J_SCANNER_CODE_LEAK',
  'AST scanner emitted TypeScript-code false positives'
]) assert.ok(scanner.includes(token),token);

assert.ok(!scanner.includes('const jsxText=/>'));
console.log('V804J_AST_VISIBLE_UI_SCANNER_SOURCE_CONTRACT=PASSED');
