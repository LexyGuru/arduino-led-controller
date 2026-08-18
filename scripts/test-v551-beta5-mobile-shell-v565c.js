#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const read = (p) => fs.readFileSync(p, 'utf8');

const app = read('desktop-tauri/src/App.tsx');
const main = read('desktop-tauri/src/main.tsx');
const css = read('desktop-tauri/src/v551-beta5-mobile-shell-foundation.css');
const bottom = read('desktop-tauri/src/components/BottomNav.tsx');
const topbar = read('desktop-tauri/src/components/Topbar.tsx');

/* Preserve exact legacy/Beta.4 shell identity contract. */
assert.match(
  app,
  /className="app-shell core-ui-v15 core-ui-v20 beta4-ui-baseline"/
);
assert.doesNotMatch(app, /beta5-mobile-shell/);

/* Beta.5 closure must be imported after every previous style layer. */
const importNeedle = "import './v551-beta5-mobile-shell-foundation.css';";
assert.match(main, /import '\.\/v551-beta5-mobile-shell-foundation\.css';/);
const beta5Index = main.indexOf(importNeedle);
assert.ok(beta5Index >= 0, 'Beta.5 mobile CSS import missing');
const styleImports = [...main.matchAll(/^import '(\.\/[^']+\.css)';$/gm)]
  .map((m) => ({ path: m[1], index: m.index }));
const laterStyle = styleImports.find((entry) => entry.index > beta5Index);
assert.equal(laterStyle, undefined, `Beta.5 mobile closure is not last; later style=${laterStyle?.path}`);

assert.match(css, /@media \(max-width: 820px\)/);
assert.match(css, /html,\s*body,\s*#root\s*\{[\s\S]*?overflow:\s*hidden/);
assert.match(css, /\.app-shell\.beta4-ui-baseline\s*\{[\s\S]*?height:\s*100dvh[\s\S]*?overflow:\s*hidden/);
assert.match(css, /\.beta4-ui-baseline \.content-shell\s*\{[\s\S]*?grid-template-rows:\s*auto minmax\(0, 1fr\)[\s\S]*?overflow:\s*hidden/);
assert.match(css, /\.beta4-ui-baseline \.content\s*\{[\s\S]*?overflow-y:\s*auto/);
assert.match(css, /-webkit-overflow-scrolling:\s*touch/);

assert.match(css, /\.beta4-ui-baseline \.bottom-nav\s*\{[\s\S]*?position:\s*fixed/);
assert.match(css, /bottom:\s*calc\(8px \+ var\(--core-safe-bottom\)\)/);
assert.match(css, /\.beta4-ui-baseline \.mobile-more-sheet\s*\{[\s\S]*?position:\s*fixed/);
assert.match(css, /\.beta4-ui-baseline \.mobile-more-panel\s*\{[\s\S]*?bottom:\s*calc\(82px \+ var\(--core-safe-bottom\)\)/);

assert.match(css, /\.beta4-ui-baseline \.core-connection-chip\s*\{[\s\S]*?width:\s*40px[\s\S]*?min-width:\s*40px[\s\S]*?max-width:\s*40px[\s\S]*?border-radius:\s*50%/);
assert.match(css, /\.beta4-ui-baseline \.core-connection-chip > div\s*\{[\s\S]*?display:\s*none/);
assert.match(css, /\.beta4-ui-baseline \.core-topbar-kicker,[\s\S]*?\.topbar-tagline\s*\{[\s\S]*?display:\s*none/);
assert.match(css, /\.beta4-ui-baseline \.core-topbar\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0, 1fr\) auto/);

assert.match(bottom, /className="bottom-nav"/);
assert.match(bottom, /className="mobile-more-sheet"/);
assert.match(topbar, /core-connection-chip/);
assert.match(topbar, /core-refresh-button/);

/* Scope guard: no landscape/tablet/desktop override block in this closure. */
assert.doesNotMatch(css, /@media \(orientation:\s*landscape\)/);
assert.doesNotMatch(css, /min-width:\s*821px/);

console.log('BETA5_APP_SHELL_LEGACY_CONTRACT=PRESERVED');
console.log('BETA5_LAST_STYLE_CLOSURE=PASSED');
console.log('BETA5_VIEWPORT_SCROLL_SHELL=PASSED');
console.log('BETA5_FIXED_BOTTOM_NAV=PASSED');
console.log('BETA5_SAFE_AREA_NAVIGATION=PASSED');
console.log('BETA5_COMPACT_CONNECTION_CHIP=PASSED');
console.log('BETA5_MOBILE_MORE_SHEET=PASSED');
console.log('BETA5_LANDSCAPE_DESKTOP_SCOPE=PRESERVED');
