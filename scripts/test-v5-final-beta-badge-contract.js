const fs=require('fs'),assert=require('assert');

const badge=fs.readFileSync('desktop-tauri/src/components/v5/V5BetaBadge.tsx','utf8');
const sidebar=fs.readFileSync('desktop-tauri/src/components/Sidebar.tsx','utf8');

assert.match(badge,/export function V5BetaBadge/);
assert.match(badge,/<Zap/);
assert.match(badge,/BETA/);
assert.match(badge,/linear-gradient/);
assert.match(badge,/beta/i);

assert.match(sidebar,/V5BetaBadge/);
assert.match(sidebar,/version=\{appVersion\}/);
assert.match(sidebar,/sidebar\.application/);

console.log('V5_FINAL_BETA_BADGE_CONTRACT=PASSED');
