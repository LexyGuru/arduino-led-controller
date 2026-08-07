#!/usr/bin/env node
const fs = require('fs');

function assert(cond, msg) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
}

const css = fs.readFileSync('desktop-tauri/src/beta7-theme.css', 'utf8');

assert(
  css.includes('.v5-observability-list.tauri-audit-list>.audit-entry{'),
  'audit-specific high-specificity selector missing'
);
assert(
  css.includes('grid-template-columns:72px minmax(76px,96px) minmax(0,1fr)'),
  'desktop audit grid columns missing'
);
assert(
  css.includes('@media(max-width:1100px)'),
  'medium-width audit breakpoint missing'
);
assert(
  css.includes('.v5-observability-list.tauri-audit-list>.audit-entry{grid-template-columns:68px minmax(70px,86px) minmax(0,1fr)}'),
  'medium-width audit grid missing'
);
assert(
  css.includes('@media(max-width:760px)'),
  'narrow audit breakpoint missing'
);
assert(
  css.includes('.v5-observability-list.tauri-audit-list>.audit-entry{grid-template-columns:68px minmax(0,1fr);gap:5px 10px}'),
  'narrow two-column audit grid missing'
);
assert(
  css.includes('.v5-observability-list.tauri-audit-list>.audit-entry>span{grid-column:1/-1}'),
  'narrow audit message row missing'
);
assert(
  css.includes('overflow-wrap:anywhere'),
  'audit overflow protection missing'
);

console.log('AUDIT_SELECTOR_SPECIFICITY=PASSED');
console.log('AUDIT_DESKTOP_GRID=PASSED');
console.log('AUDIT_MEDIUM_GRID=PASSED');
console.log('AUDIT_NARROW_GRID=PASSED');
console.log('AUDIT_OVERFLOW_PROTECTION=PASSED');
console.log('BETA7_AUDIT_LIST_RESPONSIVE_CONTRACT=PASSED');
